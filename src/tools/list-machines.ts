import { z } from "zod";
import { execFlyctl, parseJson, FlyctlError } from "../flyctl.js";

export const listMachinesSchema = {
  app: z.string().describe("Fly.io application name"),
};

export async function listMachines(params: { app: string }) {
  const args = ["machines", "list", "-a", params.app, "-j"];

  try {
    const raw = await execFlyctl(args);
    const machines = parseJson(raw);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(machines, null, 2) }],
    };
  } catch (e) {
    const msg = e instanceof FlyctlError ? e.stderr || e.message : String(e);
    return {
      content: [{ type: "text" as const, text: `Error listing machines: ${msg}` }],
      isError: true,
    };
  }
}
