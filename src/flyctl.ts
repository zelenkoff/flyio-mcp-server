import { execFile } from "node:child_process";

export class FlyctlError extends Error {
  constructor(
    message: string,
    public readonly stderr: string,
    public readonly exitCode: number | null,
  ) {
    super(message);
    this.name = "FlyctlError";
  }
}

export function execFlyctl(
  args: string[],
  timeoutMs = 30_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = execFile("flyctl", args, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        reject(
          new FlyctlError(
            `flyctl ${args[0]} failed: ${stderr || error.message}`,
            stderr,
            error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" ? null : (error as any).code ?? null,
          ),
        );
        return;
      }
      resolve(stdout);
    });
  });
}

export function parseJson(raw: string): unknown {
  return JSON.parse(raw);
}

export function parseNdjson(raw: string): unknown[] {
  const results: unknown[] = [];
  for (const line of raw.trim().split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      results.push(JSON.parse(trimmed));
    } catch {
      // Skip non-JSON lines (e.g. flyctl status messages)
    }
  }
  return results;
}
