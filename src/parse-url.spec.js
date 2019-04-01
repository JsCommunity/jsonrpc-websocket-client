/* eslint-env jest */

import parseUrl from "./parse-url";

// ===================================================================

describe("parseUrl()", () => {
  it("protocol is added if missing", () => {
    expect(parseUrl("example.org")).toBe("ws://example.org");
  });

  it("HTTP(s) is converted to WS(s)", () => {
    expect(parseUrl("http://example.org")).toBe("ws://example.org");
    expect(parseUrl("https://example.org")).toBe("wss://example.org");
  });

  describe("in a browser", () => {
    beforeAll(() => {
      global.window = {
        location: {
          toString: () => "http://example.org/foo/bar",
        },
      };
    });

    afterAll(() => {
      delete global.window;
    });

    it("current URL is used by default", () => {
      expect(parseUrl()).toBe("ws://example.org/foo/bar");
    });

    it("relative URL is resolved against current URL", () => {
      expect(parseUrl("./api/")).toBe("ws://example.org/foo/api/");
    });
  });
});
