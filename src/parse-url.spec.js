/* eslint-env mocha */

import expect from 'must'

// ===================================================================

import parseUrl from './parse-url'

// ===================================================================

describe('parseUrl()', () => {
  it('protocol is added if missing', () => {
    expect(parseUrl('example.org')).to.equal('ws://example.org')
  })

  it('HTTP(s) is converted to WS(s)', () => {
    expect(parseUrl('http://example.org')).to.equal('ws://example.org')
    expect(parseUrl('https://example.org')).to.equal('wss://example.org')
  })

  describe('in a browser', () => {
    before(() => {
      global.window = {
        location: {
          toString: () => 'http://example.org/foo/bar'
        }
      }
    })

    after(() => {
      delete global.window
    })

    it('current URL is used by default', () => {
      expect(parseUrl()).to.equal('ws://example.org/foo/bar')
    })

    it('relative URL is resolved against current URL', () => {
      expect(parseUrl('./api/')).to.equal('ws://example.org/foo/api/')
    })
  })
})
