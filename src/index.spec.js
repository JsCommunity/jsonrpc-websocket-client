/* eslint-env jest */

import eventToPromise from 'promise-toolbox/fromEvent'
import Peer, {JsonRpcError} from 'json-rpc-peer'
import {Server as WebSocketServer} from 'ws'

import Client, {AbortedConnection, ConnectionError} from './index'

// ===================================================================

function noop () {}

// ===================================================================

describe('Client', () => {
  let server
  let serverPort
  beforeAll(() => new Promise(resolve => {
    server = new WebSocketServer({
      host: 'localhost',
      port: 0,
    }, function () {
      serverPort = this.address().port

      resolve()
    }).on('connection', socket => {
      const jsonRpc = new Peer(message => {
        if (message.type === 'notification') {
          return
        }

        if (message.method === 'identity') {
          return message.params[0]
        }

        if (message.method === 'error') {
          throw new JsonRpcError(message.params[0])
        }
      })

      jsonRpc.on('data', data => {
        if (socket.readyState === socket.OPEN) {
          socket.send(data)
        }
      })
      socket.on('message', message => {
        jsonRpc.write(message)
      })
    })
  }))
  afterAll(() => {
    server.close()
  })

  let client
  beforeEach(() => {
    client = new Client('ws://localhost:' + serverPort)
  })
  afterEach(() => {
    client.close().catch(noop)
  })

  it('emits a `open` event on connection', () => {
    client.open()

    return eventToPromise(client, 'open')
  })

  it('emits a `closed` event on disconnection', () => {
    return client.open().then(() => {
      client.close()

      return eventToPromise(client, 'closed')
    })
  })

  describe('#connect()', () => {
    it('returns a promise which rejects if connecting', () => {
      client.open().catch(noop)
      return expect(client.open()).rejects.toBeInstanceOf(ConnectionError)
    })

    it('returns a promise which rejects if open', () => {
      return client.open().then(() => {
        return expect(client.open()).rejects.toBeInstanceOf(ConnectionError)
      })
    })

    it('returns a promise which resolves when open', () => {
      return client.open()
    })

    it('returns a promise which rejects on connection error', () => {
      client = new Client('ws://localhost:-1')

      return expect(client.open()).rejects.toBeInstanceOf(ConnectionError)
    })
  })

  describe('#close()', () => {
    it('returns a promise which resolve when disconnected', () => {
      return client.open().then(() =>
        client.close()
      )
    })

    it('returns a promise which resolve if disconnected', () => {
      return client.close()
    })

    it('aborts the connection if connecting', () => {
      const promise = client.open()

      return client.close().then(() =>
        expect(promise).rejects.toBeInstanceOf(AbortedConnection)
      )
    })

    it('fails all waiting calls', () => {
      return client.open().then(() => {
        const promise = client.call('foo')
        return client.close().then(() =>
          expect(promise).rejects.toBeInstanceOf(ConnectionError)
        )
      })
    })
  })

  describe('#call()', () => {
    it('returns a promise which rejects if not open', () =>
      expect(client.call('foo')).rejects.toBeInstanceOf(ConnectionError)
    )

    it('returns a promise which resolves with the result of the request', () => {
      return client.open().then(() =>
        client.call('identity', [42])
      ).then(result => {
        expect(result).toBe(42)
      })
    })

    it('returns a promise which rejects with the error of the request', () => {
      return client.open().then(
        () => client.call('error', ['an error'])
      ).then(
        () => { throw new Error('must have rejected') },
        error => {
          expect(error.message).toBe('an error')
        }
      )
    })
  })

  describe('#status', () => {
    it('is `closed` when created', () => {
      expect(client.status).toBe('closed')
    })

    it('is `connecting` during connection', () => {
      client.open().catch(noop)

      expect(client.status).toBe('connecting')
    })

    it('is `open` after connection', () => {
      return client.open().then(() => {
        expect(client.status).toBe('open')
      })
    })

    it('is `closed` after disconnection', () => {
      return client.open().then(() =>
        client.close()
      ).then(() => {
        expect(client.status).toBe('closed')
      })
    })
  })
})
