/* eslint-env mocha */

import expect from 'must'

import createBackoff, {
  fibonacci,
  take
} from './backoff'

// ===================================================================

expect.prototype.iterable = function () {
  let _ = this.actual

  this.assert((
    _ &&
    typeof (_ = _[Symbol.iterator]) === 'function' &&
    (_ = _()) &&
    typeof _.next === 'function'
  ), 'be an iterable')
}

// ===================================================================

describe.only('fibonacci()', () => {
  it('returns an iterable', () => {
    expect(fibonacci()).to.be.an.iterable()
  })

  it('generates the Fibonacci sequence', () => {
    expect([ ...fibonacci()::take(10) ])
      .to.eql([ 1, 1, 2, 3, 5, 8, 13, 21, 34, 55 ])
  })
})

describe('createBackoff()', () => {
  it('returns an iterable', () => {
    expect(createBackoff()).to.be.an.iterable()
  })
})
