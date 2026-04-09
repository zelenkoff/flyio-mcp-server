#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
import { listAppsSchema, listApps } from "./tools/list-apps.js";
import { getLogsSchema, getLogs } from "./tools/get-logs.js";
import { getStatusSchema, getStatus } from "./tools/get-status.js";
import { listMachinesSchema, listMachines } from "./tools/list-machines.js";
import { queryDbSchema, queryDb } from "./tools/query-db.js";

function registerTools(server: McpServer) {
  server.tool(
    "list_apps",
    "List all Fly.io applications. Returns app names, status, org, and latest deploy time.",
    listAppsSchema,
    async (params) => listApps(params),
  );

  server.tool(
    "get_logs",
    "Get recent logs for a Fly.io application. Returns the latest buffered log lines with timestamps, levels, and regions.",
    getLogsSchema,
    async (params) => getLogs(params),
  );

  server.tool(
    "get_status",
    "Get the current status of a Fly.io application including machines, regions, and deployment info.",
    getStatusSchema,
    async (params) => getStatus(params),
  );

  server.tool(
    "list_machines",
    "List all machines (VMs) for a Fly.io application with their state, region, and configuration.",
    listMachinesSchema,
    async (params) => listMachines(params),
  );

  server.tool(
    "query_db",
    "Run a read-only SQL query against a Postgres database on a Fly.io machine via SSH.",
    queryDbSchema,
    async (params) => queryDb(params),
  );
}

const mode = process.argv.includes("--http") ? "http" : "stdio";

if (mode === "http") {
  const port = parseInt(process.env.PORT || "3000", 10);

  const httpServer = createServer(async (req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.url !== "/mcp") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const server = new McpServer({ name: "flyio", version: "1.0.0" });
    registerTools(server);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  httpServer.listen(port, () => {
    console.error(`Fly.io MCP server listening on http://0.0.0.0:${port}/mcp`);
  });
} else {
  const server = new McpServer({ name: "flyio", version: "1.0.0" });
  registerTools(server);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
