import fromEvent from "promise-toolbox/fromEvent";
import fromEvents from "promise-toolbox/fromEvents";
import pTry from "promise-toolbox/try";
import WebSocket from "isomorphic-ws";
import { BaseError } from "make-error";
import { EventEmitter } from "events";

// ===================================================================

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ===================================================================

// This error is used to fail pending requests when the connection is
// closed.
export class ConnectionError extends BaseError {}

export class AbortedConnection extends ConnectionError {
  constructor() {
    super("connection aborted");
  }
}

// -------------------------------------------------------------------

export const CLOSED = "closed";
export const CONNECTING = "connecting";
export const MESSAGE = "message";
export const OPEN = "open";

// -------------------------------------------------------------------

export default class WebSocketClient extends EventEmitter {
  constructor(url, protocols, opts) {
    super();

    if (opts && !url.startsWith("wss")) {
      // `rejectUnauthorized` cannot be used if the connection is not
      // `secure!
      delete opts.rejectUnauthorized;
    }

    this._opts = opts;
    this._protocols = protocols;
    this._url = url;

    this._protocol = null;
    this._socket = null;
    this._status = CLOSED;

    this._onClose = this._onClose.bind(this);
  }

  get protocol() {
    return this._protocol;
  }

  get status() {
    return this._status;
  }

  close() {
    return pTry(() => {
      const status = this._status;
      if (status === CLOSED) {
        return;
      }

      const socket = this._socket;
      if (status === CONNECTING) {
        socket.abort = true;
        socket.close();
        return;
      }

      const promise = fromEvent(socket, "close");
      socket.close();
      return promise;
    });
  }

  open(backoff) {
    if (!backoff) {
      return this._open();
    }

    const iterator = backoff[Symbol.iterator]();

    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };

    let error_;
    const attempt = () => {
      if (cancelled) {
        throw error_;
      }

      return this._open().catch((error) => {
        let current;

        if (
          error instanceof AbortedConnection ||
          (current = iterator.next()).done
        ) {
          throw error;
        }

        const { value } = current;
        this.emit("scheduledAttempt", {
          cancel,
          delay: value,
        });

        error_ = error;
        return delay(current.value).then(attempt);
      });
    };

    const promise = attempt();
    promise.cancel = cancel;

    return promise;
  }

  send(data) {
    this._assertStatus(OPEN);

    this._socket.send(data);
  }

  _assertNotStatus(notExpected) {
    if (this._status === notExpected) {
      throw new ConnectionError(`invalid status ${this._status}`);
    }
  }

  _assertStatus(expected) {
    if (this._status !== expected) {
      throw new ConnectionError(
        `invalid status ${this._status}, expected ${expected}`
      );
    }
  }

  _onClose() {
    const previous = this._status;

    this._socket = null;
    this._status = CLOSED;

    if (previous === OPEN) {
      this.emit(CLOSED);
    }
  }

  _open() {
    return pTry(() => {
      this._assertStatus(CLOSED);
      this._status = CONNECTING;

      return pTry(() => {
        const socket = (this._socket = new WebSocket(
          this._url,
          this._protocols,
          this._opts
        ));

        return fromEvents(socket, ["open"], ["close", "error"]).then(
          () => {
            socket.addEventListener("close", this._onClose);

            socket.addEventListener("error", (error) => {
              this.emit("error", error);
            });

            socket.addEventListener("message", ({ data }) => {
              this.emit(MESSAGE, data);
            });

            this._status = OPEN;
            this.emit(OPEN);
          },
          ([error]) => {
            if (socket.abort) {
              throw new AbortedConnection();
            }

            throw error;
          }
        );
      }).catch((error) => {
        this._onClose();

        throw error;
      });
    });
  }
}
