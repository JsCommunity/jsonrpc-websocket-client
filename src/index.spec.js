/* eslint-env mocha */

import expect from 'must'

// ===================================================================

import eventToPromise from 'event-to-promise'
import Peer, {JsonRpcError} from 'json-rpc-peer'
import {Server as WebSocketServer} from 'ws'

import Client, {ConnectionError} from './index'

// ===================================================================

function noop () {}

// ===================================================================

describe('Client', () => {
  let serverPort
  before(done => {
    new WebSocketServer({
      host: 'localhost',
      port: 0
    }, function () {
      serverPort = this.address().port

      done()
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
  })

  let client
  beforeEach(() => {
    client = new Client('ws://localhost:' + serverPort)
  })
  afterEach(() => {
    client.close().catch(noop)
  })

  it('emits a `connected` event on connection', () => {
    client.connect()

    return eventToPromise(client, 'connected')
  })

  it('emits a `disconnected` event on disconnection', () => {
    return client.connect().then(() => {
      client.close()

      return eventToPromise(client, 'disconnected')
    })
  })

  describe('#connect()', () => {
    it('returns a promise which rejects if connecting', () => {
      client.connect()
      return expect(client.connect()).to.reject()
    })

    it('returns a promise which rejects if connected', () => {
      return client.connect().then(() => {
        return expect(client.connect()).to.reject()
      })
    })

    it('returns a promise which resolves when connected', () => {
      return client.connect()
    })

    it('returns a promise which rejects on connection error', () => {
      client = new Client('ws://localhost:-1')

      return expect(client.connect()).to.reject()
    })
  })

  describe('#close()', () => {
    it('returns a promise which rejects if disconnected', () => {
      return expect(client.close()).to.reject()
    })

    it('returns a promise which resolve when disconnected', () => {
      return client.connect().then(() => {
        return client.close()
      })
    })

    it('aborts the connection if connecting', () => {
      const promise = client.connect()

      return client.close().then(() => {
        return expect(promise).to.reject()
      })
    })

    it('fails all waiting calls', () => {
      return client.connect().then(() => {
        const promise = client.call('foo')
        return client.close().then(() => {
          return expect(promise).to.reject.to.an.error(ConnectionError)
        })
      })
    })
  })

  describe('#call()', () => {
    it('returns a promise which rejects if not connected', () => {
      return expect(client.call('foo')).to.reject()
    })

    it('returns a promise which resolves with the result of the request', () => {
      return client.connect().then(() => {
        return client.call('identity', [42])
      }).then(result => {
        expect(result).to.equal(42)
      })
    })

    it('returns a promise which rejects with the error of the request', () => {
      return client.connect().then(() => {
        return expect(client.call('error', ['an error'])).to.reject.to.an.error('an error')
      })
    })
  })

  describe('#status', () => {
    it('is `disconnected` when created', () => {
      expect(client.status).to.equal('disconnected')
    })

    it('is `connecting` during connection', () => {
      client.connect()

      expect(client.status).to.equal('connecting')
    })

    it('is `connected` after connection', () => {
      return client.connect().then(() => {
        expect(client.status).to.equal('connected')
      })
    })

    it('is `diconnected` after disconnection', () => {
      return client.connect().then(() => {
        client.close()

        expect(client.status).to.equal('disconnected')
      })
    })
  })
})
