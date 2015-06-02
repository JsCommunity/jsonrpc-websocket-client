/* eslint-env mocha */

import expect from 'must'

// ===================================================================

import parseUrl from './parse-url'

// ===================================================================

describe('parseUrl()', function () {
  it('protocol is added if missing', function () {
    expect(parseUrl('example.org')).to.equal('ws://example.org')
  })

  it('HTTP(s) is converted to WS(s)', function () {
    expect(parseUrl('http://example.org')).to.equal('ws://example.org')
    expect(parseUrl('https://example.org')).to.equal('wss://example.org')
  })

  describe('in a browser', function () {
    before(function () {
      global.window = {
        location: {
          toString: () => 'http://example.org/foo/bar'
        }
      }
    })

    after(function () {
      delete global.window
    })

    it('current URL is used by default', function () {
      expect(parseUrl()).to.equal('ws://example.org/foo/bar')
    })

    it('relative URL is resolved against current URL', function () {
      expect(parseUrl('./api/')).to.equal('ws://example.org/foo/api/')
    })
  })
})
