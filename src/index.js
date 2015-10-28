import eventToPromise from 'event-to-promise'
import isString from 'lodash.isstring'
import Peer from 'json-rpc-peer'
import startsWith from 'lodash.startswith'
import WebSocket from 'ws'
import {BaseError} from 'make-error'
import {EventEmitter} from 'events'
import {MethodNotFound} from 'json-rpc-peer'

import parseUrl from './parse-url'

// ===================================================================

const READY_STATE_TO_STATUS = {
  [WebSocket.CONNECTING]: 'connecting',
  [WebSocket.OPEN]: 'connected',
  [WebSocket.CLOSED]: 'disconnected',

  // We consider that closing is already disconnected.
  [WebSocket.CLOSING]: 'disconnected'
}

function extractProperty (object, property) {
  const value = object[property]
  delete object[property]
  return value
}

// ===================================================================

export class ConnectionError extends BaseError {}

// ===================================================================

// TODO: implements #notify()
export default class JsonRpcWebSocketClient extends EventEmitter {
  constructor (opts) {
    super()

    if (!opts || isString(opts)) {
      opts = {
        url: opts
      }
    }

    this._url = parseUrl(extractProperty(opts, 'url'))

    this._protocols = extractProperty(opts, 'protocols') || ''

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

    this._socket = null
  }

  get status () {
    const {_socket: socket} = this

    return socket ?
      READY_STATE_TO_STATUS[socket.readyState] :
      'disconnected'
  }

  // TODO: call() because RPC or request() because JSON-RPC?
  call (method, params) {
    return new Promise((resolve, reject) => {
      this._assertStatus('connected')

      this._jsonRpc.request(method, params).then(resolve, reject)
    })
  }

  // TODO: close() because net.Server or disconnect() because
  // connect()?
  close () {
    return new Promise((resolve, reject) => {
      this._assertNotStatus('disconnected')

      const {_socket: socket} = this
      this._socket = null

      socket.close()
      eventToPromise(socket, 'close').then(resolve, reject)
    })
  }

  connect () {
    return new Promise((resolve, reject) => {
      this._assertStatus('disconnected')

      const socket = new WebSocket(this._url, this._protocols, this._opts)
      this._socket = socket

      let hasConnected = false
      socket.addEventListener('open', () => {
        hasConnected = true

        resolve()
        this.emit('connected')
      })

      socket.addEventListener('error', () => {
        this._socket = null

        reject()
      })

      const {_jsonRpc: jsonRpc} = this

      socket.addEventListener('message', message => {
        jsonRpc.write(message.data)
      })

      socket.addEventListener('close', () => {
        this._socket = null

        jsonRpc.failPendingRequests(new ConnectionError())

        if (hasConnected) {
          this.emit('disconnected')
        } else {
          reject(new Error('connection aborted'))
        }
      })
    })
  }

  _assertNotStatus (notExpected) {
    const {status} = this

    if (status === notExpected) {
      throw new Error(`invalid status ${status}`)
    }
  }

  _assertStatus (expected) {
    const {status} = this

    if (status !== expected) {
      throw new Error(`invalid status ${status}, expected ${expected}`)
    }
  }
}
