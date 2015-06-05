# jsonrpc-websocket-client [![Build Status](https://travis-ci.org/jsonrpc-websocket-client.png?branch=master)](https://travis-ci.org/jsonrpc-websocket-client)

> JSON-RPC 2 over WebSocket

## Install

Installation of the [npm package](https://npmjs.org/package/jsonrpc-websocket-client):

```
> npm install --save jsonrpc-websocket-client
```

## Usage

```javascript
import Client from 'jsonrpc-websocket-client'

const client = new Client('ws://example.org')

console.log(client.status)
// → disconnected

client.connect().then(() => {
  console.log(client.status)
  // → connected

  return client.call('method', [1, 2, 3]).then(result => {
    console.log(result)
  })
}).then(result => {
  client.close()
})
```

## Development

### Installing dependencies

```
> npm install
```

### Compilation

The sources files are watched and automatically recompiled on changes.

```
> npm run dev
```

### Tests

```
> npm run test-dev
```

## Contributions

Contributions are *very* welcomed, either on the documentation or on
the code.

You may:

- report any [issue](https://github.com/julien-f/jsonrpc-websocket-client/issues)
  you've encountered;
- fork and create a pull request.

## License

ISC © [Julien Fontanet](https://julien.isonoe.net)
