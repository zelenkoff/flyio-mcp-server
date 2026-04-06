import { z } from "zod";
import { execFlyctl, FlyctlError } from "../flyctl.js";

const MAX_LOG_LINES = 100;

export const getLogsSchema = {
  app: z.string().describe("Fly.io application name"),
  region: z.string().optional().describe("Filter by region (e.g. 'iad', 'lhr')"),
  machine: z.string().optional().describe("Filter by machine ID"),
};

export async function getLogs(params: {
  app: string;
  region?: string;
  machine?: string;
}) {
  const args = ["logs", "-a", params.app, "--no-tail", "-j"];
  if (params.region) args.push("--region", params.region);
  if (params.machine) args.push("--machine", params.machine);

  try {
    const raw = await execFlyctl(args, 15_000);
    const normalized = "[" + raw.trim().replace(/\}\s*\{/g, "},{") + "]";
    const lines = JSON.parse(normalized) as any[];

    const truncated = lines.length > MAX_LOG_LINES;
    const display = truncated ? lines.slice(-MAX_LOG_LINES) : lines;

    let text = "";
    if (truncated) {
      text += `[Showing last ${MAX_LOG_LINES} of ${lines.length} log lines]\n\n`;
    }
    text += display
      .map((entry: any) => {
        const ts = entry.timestamp || "";
        const level = entry.level || "";
        const region = entry.region || "";
        const msg = entry.message || JSON.stringify(entry);
        return `[${ts}] [${level}] [${region}] ${msg}`;
      })
      .join("\n");

    return {
      content: [{ type: "text" as const, text }],
    };
  } catch (e) {
    const msg = e instanceof FlyctlError ? e.stderr || e.message : String(e);
    return {
      content: [{ type: "text" as const, text: `Error fetching logs: ${msg}` }],
      isError: true,
    };
  }
}
