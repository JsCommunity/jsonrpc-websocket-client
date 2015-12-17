import eventToPromise from 'event-to-promise'
import isString from 'lodash.isstring'
import Peer from 'json-rpc-peer'
import startsWith from 'lodash.startswith'
import WebSocket from 'ws'
import { BaseError } from 'make-error'
import { EventEmitter } from 'events'
import { MethodNotFound } from 'json-rpc-peer'

import parseUrl from './parse-url'

// ===================================================================

// This error is used to fail pending requests when the connection is
// closed.
export class ConnectionError extends BaseError {}

export class AbortedConnection extends ConnectionError {}

const CONNECTED = 'connected'
const CONNECTING = 'connecting'
const DISCONNECTED = 'disconnected'

// ===================================================================

// TODO: implements #notify()
export default class JsonRpcWebSocketClient extends EventEmitter {
  constructor (opts) {
    super()

    let url, protocols
    if (!opts) {
      opts = {}
    } else if (isString(opts)) {
      url = opts
      opts = {}
    } else {
      ({ url, protocols = '', ...opts } = opts)
    }

    this._url = parseUrl(url)

    this._protocols = protocols

    if (!startsWith(this._url, 'wss')) {
      // `rejectUnauthorized` cannot be used if the connection is not
      // `secure!
      delete opts.rejectUnauthorized
    }
    this._opts = opts

    this._jsonRpc = new Peer(message => {
      // This peer is only a client and does not support requests.
      if (message.type !== 'notification') {
        throw new MethodNotFound()
      }

      this.emit('notification', message)
    }).on('data', message => {
      this._socket.send(message)
    })

    this._connection = null
    this._socket = null
    this._status = null
  }

  get status () {
    return this._status
  }

  // TODO: call() because RPC or request() because JSON-RPC?
  call (method, params) {
    return new Promise((resolve, reject) => {
      this._assertStatus(CONNECTED)

      this._jsonRpc.request(method, params).then(resolve, reject)
    })
  }

  // TODO: close() because net.Server or disconnect() because
  // connect()?
  close () {
    return new Promise((resolve, reject) => {
      this._assertNotStatus(DISCONNECTED)

      const {_socket: socket} = this
      this._socket = null

      socket.close()
      eventToPromise(socket, 'close').then(resolve, reject)
    })
  }

  async connect () {
    this._assertStatus(DISCONNECTED)

    // TODO: Abort next scheduled attempt if any.

    const socket = new WebSocket(
      this._url,
      this._protocols,
      this._opts
    )

    this._setStatus(CONNECTING)

    try {
      await eventToPromise.multi(socket, [ 'open' ], [ 'close', 'error' ])
    } catch (args) {
      const { event } = args
      const [ error ] = args

      this._setStatus(DISCONNECTED)

      if (event === 'close') {
        throw new ConnectionError('connection aborted')
      }

      throw new ConnectionError(error.message)
    }

    const jsonRpc = this._jsonRpc

    socket.on('message', ({ data }) => {
      jsonRpc.write(data)
    })

    socket.addEventListener('close', () => {
      this._socket = null

      jsonRpc.failPendingRequests(new ConnectionError('connection has been closed'))

      // Synchronous, better to do it at the very end.
      this._setStatus(DISCONNECTED)
    })

    this._socket = socket
    this._setStatus(CONNECTED)
  }

  _assertNotStatus (notExpected) {
    const {status} = this

    if (status === notExpected) {
      throw new ConnectionError(`invalid status ${status}`)
    }
  }

  _assertStatus (expected) {
    const {status} = this

    if (status !== expected) {
      throw new ConnectionError(`invalid status ${status}, expected ${expected}`)
    }
  }

  _setStatus (status) {
    this._status = status

    this.emit(status)
  }
}
