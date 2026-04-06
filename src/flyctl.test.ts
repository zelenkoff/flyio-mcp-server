import { describe, it, expect } from "vitest";
import { parseNdjson } from "./flyctl.js";

describe("parseNdjson", () => {
  it("parses valid NDJSON lines", () => {
    const input = '{"a":1}\n{"b":2}\n{"c":3}';
    expect(parseNdjson(input)).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it("skips non-JSON lines", () => {
    const input = '{"a":1}\nsome warning text\n{"b":2}';
    expect(parseNdjson(input)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("handles empty input", () => {
    expect(parseNdjson("")).toEqual([]);
    expect(parseNdjson("  \n  \n  ")).toEqual([]);
  });

  it("handles single valid line", () => {
    expect(parseNdjson('{"ok":true}')).toEqual([{ ok: true }]);
  });

  it("skips lines that are fragments of pretty-printed JSON", () => {
    // Individual lines of pretty-printed JSON are not valid JSON
    const input = '{\n  "level": "info"\n}';
    // Only the "{" and "}" lines would fail, the middle line also fails
    // since it's not a complete JSON value on its own
    const result = parseNdjson(input);
    // None of these individual lines are valid JSON
    expect(result).toEqual([]);
  });
});
