import { z } from "zod";
import { execFlyctl, parseJson, FlyctlError } from "../flyctl.js";

export const listAppsSchema = {
  org: z.string().optional().describe("Filter by organization slug"),
};

export async function listApps(params: { org?: string }) {
  const args = ["apps", "list", "-j"];
  if (params.org) args.push("--org", params.org);

  try {
    const raw = await execFlyctl(args);
    const apps = parseJson(raw);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(apps, null, 2) }],
    };
  } catch (e) {
    const msg = e instanceof FlyctlError ? e.stderr || e.message : String(e);
    return {
      content: [{ type: "text" as const, text: `Error listing apps: ${msg}` }],
      isError: true,
    };
  }
}
