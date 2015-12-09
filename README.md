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

async function main () {
  const client = new Client('ws://example.org')

  console.log(client.status)
  // → disconnected

  await client.connect()

  console.log(client.status)
  // → connected

  console.log(
    await client.call('method', [1, 2, 3])
  )

  await client.close()
}

// Run the main function and prints any errors.
main().catch(error => {
  console.error(error)
  process.exit(1)
})
```

### Creation

```js
const client = new Client(opts)
```

`opts` is either a string (the URL of the server) or an object with
the following properties:

- `url`: URL of the JSON-RPC server
- `protocols` (*optional*): the WebSocket sub-protocols to use

### Connection management

**Status**

```js
console.log(client.status)
```

Possible values:

- `connected`
- `connecting`
- `disconnected`

**Connection**

```js
await client.connect()
```

**Disconnection**

```js
await client.close()
```

This method can also be used to abort the connection while connecting.

### Events

**Connection**

```js
client.on('connecting', () => {
  console.log('client is connecting...')
})

client.on('connected', () => {
  console.log('client is now connected')
})
```

**Disconnection**

```js
client.on('disconnected', () => {
  console.log('client is now disconnected')
})
```

**Notification**

```js
client.on('notification', notification => {
  console.log('notification received', notification)
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
