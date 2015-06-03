/* eslint-env mocha */

import expect from 'must'

// ===================================================================

import eventToPromise from 'event-to-promise'
import {createPeer} from '@julien-f/json-rpc'
import {Server as WebSocketServer} from 'ws'

import Client from './index'

// ===================================================================

function noop () {}

expect.prototype.rejected = function () {
  const {throw: throws} = expect.prototype

  return this.actual.then(
    () => {
      const ex = expect(noop)
      ex.negative = this.negative
      throws.apply(ex, arguments)
    },
    (e) => {
      const ex = expect(() => { throw e })
      ex.negative = this.negative
      throws.apply(ex, arguments)
    }
  )
}

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
      const jsonRpc = createPeer()

      jsonRpc.on('data', data => {
        socket.send(data)
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
      return expect(client.connect()).to.be.rejected()
    })

    it('returns a promise which rejects if connected', () => {
      return client.connect().then(() => {
        return expect(client.connect()).to.be.rejected()
      })
    })

    it('returns a promise which resolves when connected', () => {
      return client.connect()
    })

    it('returns a promise which rejects on connection error', () => {
      client = new Client('ws://localhost:-1')

      return expect(client.connect()).to.be.rejected()
    })

    it('returns a promise which rejects on connection abort (via `#close()`)', () => {
      const promise = client.connect()

      client.close()

      return expect(promise).to.be.rejected()
    })
  })

  describe('#close()', () => {
    it('returns a promise which rejects if disconnected', () => {
      return expect(client.close()).to.be.rejected()
    })

    it('returns a promise which resolve when disconnected')

    it('aborts the connection if connecting')

    it('fails all waiting calls')
  })

  describe('#call()', () => {
    it('returns a promise which rejects if not connected')

    it('returns a promise which resolves with the result of the request')

    it('returns a promise which rejects with the error of the request')
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
