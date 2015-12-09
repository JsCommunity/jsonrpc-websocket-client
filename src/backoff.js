const makeIterator = next => {
  const iterator = { next }
  iterator[Symbol.iterator] = () => iterator

  return iterator
}

// -------------------------------------------------------------------

// Returns an iterator to the Fibonacci sequence.
export function fibonacci () {
  let curr = 1
  let next = 1

  return makeIterator(() => {
    const tmp = curr

    curr = next
    next += tmp

    return {
      done: false,
      value: tmp
    }
  })
}

// Usage: iterable::map(fn) → iterable
export function map (fn) {
  const iterator = this[Symbol.iterator]()
  return makeIterator(() => {
    const item = iterator.next()
    if (item.done) {
      return { done: true }
    }

    return {
      done: false,
      value: fn(item.value)
    }
  })
}

// Usage: iterable::take(n) → iterable
export function take (n) {
  const iterator = this[Symbol.iterator]()
  return makeIterator(() => {
    let item
    if (
      !n-- ||
      (item = iterator.next()).done
    ) {
      return { done: true }
    }

    return {
      done: false,
      value: item.value
    }
  })
}

// ===================================================================

export default (tries = 10) => fibonacci()
  ::map(x => Math.round((x + Math.random() - 0.5) * 1e3))
  ::take(tries)
