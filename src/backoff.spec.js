/* eslint-env jest */

import createBackoff, {
  fibonacci,
  take
} from './backoff'

// ===================================================================

const isIterable = value => (
  value &&
  typeof (value = value[Symbol.iterator]) === 'function' &&
  (value = value()) &&
  typeof value.next === 'function'
)

const toArray = iterable => {
  const iterator = iterable[Symbol.iterator]()
  const array = []
  let current
  while (!(current = iterator.next()).done) {
    array.push(current.value)
  }
  return array
}

// ===================================================================

describe('fibonacci()', () => {
  it('returns an iterable', () => {
    expect(isIterable(fibonacci())).toBe(true)
  })

  it('generates the Fibonacci sequence', () => {
    expect(toArray(fibonacci()::take(10)))
      .toEqual([ 1, 1, 2, 3, 5, 8, 13, 21, 34, 55 ])
  })
})

describe('createBackoff()', () => {
  it('returns an iterable', () => {
    expect(isIterable(createBackoff())).toBe(true)
  })
})
