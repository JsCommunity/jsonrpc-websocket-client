import Peer, { MethodNotFound } from 'json-rpc-peer'
import { fibonacci } from 'iterable-backoff'

import parseUrl from './parse-url'
import WebSocketClient, {
  ConnectionError,
  AbortedConnection,
  CLOSED,
  CONNECTING,
  MESSAGE,
  OPEN,
} from './websocket-client'

// ===================================================================

export const createBackoff = (tries = 10) =>
  fibonacci().addNoise().toMs().take(tries)

export {
  ConnectionError,
  AbortedConnection,
  CLOSED,
  CONNECTING,
  OPEN,
}

// -------------------------------------------------------------------

export default class JsonRpcWebSocketClient extends WebSocketClient {
  constructor (opts) {
    {
      let url, protocols
      if (!opts) {
        opts = {}
      } else if (typeof opts === 'string') {
        url = opts
        opts = {}
      } else {
        ({ url, protocols = '', ...opts } = opts)
      }

      super(parseUrl(url), protocols, opts)
    }

    const peer = this._peer = new Peer(message => {
      // This peer is only a client and does not support requests.
      if (message.type !== 'notification') {
        throw new MethodNotFound()
      }

      this.emit('notification', message)
    }).on('data', message => {
      this.send(message)
    })

    this.on(CLOSED, () => {
      peer.failPendingRequests(
        new ConnectionError('connection has been closed')
      )
    })

    this.on(MESSAGE, message => {
      peer.write(message)
    })
  }

  // TODO: call() because RPC or request() because JSON-RPC?
  call (method, params) {
    return this._peer.request(method, params)
  }

  notify (method, params) {
    return this._peer.notify(method, params)
  }
}
