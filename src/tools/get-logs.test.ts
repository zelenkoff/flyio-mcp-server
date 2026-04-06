import { describe, it, expect, vi } from "vitest";
import { getLogs } from "./get-logs.js";

// Mock execFlyctl to control the raw output
vi.mock("../flyctl.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../flyctl.js")>();
  return {
    ...actual,
    execFlyctl: vi.fn(),
  };
});

import { execFlyctl, FlyctlError } from "../flyctl.js";
const mockExecFlyctl = vi.mocked(execFlyctl);

describe("getLogs", () => {
  it("parses pretty-printed concatenated JSON objects", async () => {
    mockExecFlyctl.mockResolvedValue(
      `{
    "level": "info",
    "message": "hello world",
    "region": "ams",
    "timestamp": "2026-04-06T03:42:28Z"
}
{
    "level": "error",
    "message": "something broke",
    "region": "iad",
    "timestamp": "2026-04-06T03:42:29Z"
}`,
    );

    const result = await getLogs({ app: "test-app" });
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("[info]");
    expect(text).toContain("[error]");
    expect(text).toContain("hello world");
    expect(text).toContain("something broke");
    expect(text).toContain("[ams]");
    expect(text).toContain("[iad]");
  });

  it("parses a single pretty-printed JSON object", async () => {
    mockExecFlyctl.mockResolvedValue(
      `{
    "level": "info",
    "message": "only one",
    "region": "lhr",
    "timestamp": "2026-04-06T00:00:00Z"
}`,
    );

    const result = await getLogs({ app: "test-app" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("only one");
  });

  it("parses compact single-line JSON objects", async () => {
    mockExecFlyctl.mockResolvedValue(
      '{"level":"info","message":"a","region":"ams","timestamp":"T1"}\n' +
        '{"level":"warn","message":"b","region":"iad","timestamp":"T2"}',
    );

    const result = await getLogs({ app: "test-app" });
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("[info]");
    expect(text).toContain("[warn]");
  });

  it("truncates to last 100 lines when output exceeds limit", async () => {
    const entries = Array.from({ length: 150 }, (_, i) =>
      JSON.stringify({
        level: "info",
        message: `line-${i}`,
        region: "ams",
        timestamp: `T${i}`,
      }),
    ).join("\n");

    mockExecFlyctl.mockResolvedValue(entries);

    const result = await getLogs({ app: "test-app" });
    const text = result.content[0].text;
    expect(text).toContain("[Showing last 100 of 150 log lines]");
    // Should have last 100 lines (50-149)
    expect(text).toContain("line-149");
    expect(text).toContain("line-50");
    expect(text).not.toContain("line-49");
  });

  it("passes region and machine filters to flyctl args", async () => {
    mockExecFlyctl.mockResolvedValue('{"level":"info","message":"ok","region":"iad","timestamp":"T"}');

    await getLogs({ app: "my-app", region: "iad", machine: "abc123" });

    expect(mockExecFlyctl).toHaveBeenCalledWith(
      ["logs", "-a", "my-app", "--no-tail", "-j", "--region", "iad", "--machine", "abc123"],
      15_000,
    );
  });

  it("returns error when flyctl fails", async () => {
    mockExecFlyctl.mockRejectedValue(
      new FlyctlError("flyctl logs failed: timeout", "timeout", 1),
    );

    const result = await getLogs({ app: "test-app" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error fetching logs:");
  });

  it("returns error on unparseable output", async () => {
    mockExecFlyctl.mockResolvedValue("this is not json at all");

    const result = await getLogs({ app: "test-app" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error fetching logs:");
  });

  it("handles objects with } in string values", async () => {
    mockExecFlyctl.mockResolvedValue(
      `{
    "level": "info",
    "message": "closed connection }",
    "region": "ams",
    "timestamp": "T1"
}
{
    "level": "info",
    "message": "opened connection {",
    "region": "ams",
    "timestamp": "T2"
}`,
    );

    const result = await getLogs({ app: "test-app" });
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("closed connection }");
    expect(text).toContain("opened connection {");
  });
});
