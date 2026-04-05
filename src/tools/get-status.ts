import { z } from "zod";
import { execFlyctl, parseJson, FlyctlError } from "../flyctl.js";

export const getStatusSchema = {
  app: z.string().describe("Fly.io application name"),
};

export async function getStatus(params: { app: string }) {
  const args = ["status", "-a", params.app, "-j"];

  try {
    const raw = await execFlyctl(args);
    const status = parseJson(raw);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(status, null, 2) }],
    };
  } catch (e) {
    const msg = e instanceof FlyctlError ? e.stderr || e.message : String(e);
    return {
      content: [{ type: "text" as const, text: `Error fetching status: ${msg}` }],
      isError: true,
    };
  }
}
