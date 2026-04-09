import { z } from "zod";
import { execFlyctl, FlyctlError } from "../flyctl.js";

export const queryDbSchema = {
  app: z.string().describe("Fly.io application name"),
  database: z.string().describe("Postgres database name"),
  user: z.string().default("postgres").describe("Postgres user (default: postgres)"),
  query: z.string().describe("SQL query to execute (read-only)"),
};

export async function queryDb(params: {
  app: string;
  database: string;
  user: string;
  query: string;
}) {
  const sql = `BEGIN TRANSACTION READ ONLY; ${params.query}; ROLLBACK;`;
  // Use base64 encoding to avoid all shell quoting issues
  const b64 = Buffer.from(sql).toString("base64");
  const bashCmd = `echo ${b64} | base64 -d | PGPASSWORD=$OPERATOR_PASSWORD psql -h 127.0.0.1 -p 5432 -U ${params.user} -d ${params.database} -f -`;
  const args = ["ssh", "console", "-a", params.app, "-C", `bash -c "${bashCmd}"`];

  try {
    const raw = await execFlyctl(args, 15_000);
    return {
      content: [{ type: "text" as const, text: raw }],
    };
  } catch (e) {
    const msg = e instanceof FlyctlError ? e.stderr || e.message : String(e);
    return {
      content: [{ type: "text" as const, text: `Error running query: ${msg}` }],
      isError: true,
    };
  }
}
