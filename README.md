# flyio-mcp-server

An MCP (Model Context Protocol) server that gives AI coding agents access to your [Fly.io](https://fly.io) application logs, status, and machine info. Works with [Claude Code](https://docs.anthropic.com/en/docs/claude-code), Cursor, Windsurf, and any MCP-compatible client.

Under the hood it wraps the `flyctl` CLI — no API tokens needed when running locally (uses your existing `flyctl auth` session).

## Tools

| Tool | Description | Required Params | Optional Params |
|------|-------------|-----------------|-----------------|
| `list_apps` | List all Fly.io apps with status, org, and last deploy time | — | `org` |
| `get_logs` | Fetch recent application logs (last 100 lines) | `app` | `region`, `machine` |
| `get_status` | Get app status: machines, regions, deployment info | `app` | — |
| `list_machines` | List all machines (VMs) with state, region, and config | `app` | — |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [flyctl](https://fly.io/docs/flyctl/install/) installed and authenticated (`flyctl auth login`)

## Installation

### Option 1: Use directly from GitHub (recommended)

No installation needed. Just add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "flyio": {
      "command": "npx",
      "args": ["-y", "github:zelenkoff/flyio-mcp-server"]
    }
  }
}
```

For **global** access (all projects), place this file at `~/.mcp.json`.

### Option 2: Clone and run locally

```bash
git clone https://github.com/zelenkoff/flyio-mcp-server.git
cd flyio-mcp-server
npm install
```

Then reference the local path in `.mcp.json`:

```json
{
  "mcpServers": {
    "flyio": {
      "command": "node",
      "args": ["/absolute/path/to/flyio-mcp-server/dist/index.js"]
    }
  }
}
```

### Option 3: Docker (remote/VPS)

```bash
docker build -t flyio-mcp .
docker run -p 3000:3000 -e FLY_API_TOKEN=<your-token> flyio-mcp
```

Get a token with:

```bash
flyctl tokens create
```

The server listens on `http://0.0.0.0:3000/mcp` with a health check at `/health`.

Connect your MCP client to the remote URL:

```json
{
  "mcpServers": {
    "flyio": {
      "type": "url",
      "url": "http://your-vps:3000/mcp"
    }
  }
}
```

## Transports

The server supports two transport modes:

| Mode | Flag | Use Case |
|------|------|----------|
| **stdio** | *(default)* | Local usage — Claude Code spawns the process directly |
| **HTTP** | `--http` | Remote usage — runs as an HTTP server with Streamable HTTP transport |

```bash
# stdio (default)
node dist/index.js

# HTTP on port 3000 (or set PORT env var)
node dist/index.js --http
PORT=8080 node dist/index.js --http
```

## Usage Examples

Once configured, ask your AI agent:

- *"List my Fly.io apps"*
- *"Show me the logs for tiny-app"*
- *"What's the status of my-api?"*
- *"List machines for tiny-dashboard in the iad region"*
- *"Are there any errors in the logs for tgshopbot?"*

### Example: get_logs output

```
[2026-04-05T10:23:01Z] [info] [iad] Starting server on port 8080
[2026-04-05T10:23:02Z] [info] [iad] Connected to database
[2026-04-05T10:25:15Z] [error] [iad] Connection timeout to external API
```

Logs are truncated to the last 100 lines. If more are available, a summary line is shown.

## Project Structure

```
src/
  index.ts              # Entry point — stdio/HTTP transport setup
  flyctl.ts             # CLI wrapper — spawns flyctl, parses JSON/NDJSON
  tools/
    list-apps.ts        # list_apps tool
    get-logs.ts         # get_logs tool (NDJSON parsing, truncation)
    get-status.ts       # get_status tool
    list-machines.ts    # list_machines tool
```

## How It Works

1. The MCP client (Claude Code, etc.) connects to the server via stdio or HTTP
2. When a tool is called, the server spawns `flyctl` with the appropriate arguments and `-j` (JSON output)
3. The JSON response is parsed and returned to the agent
4. For logs, `flyctl logs --no-tail -j` returns newline-delimited JSON (NDJSON) — each line is parsed separately

All `flyctl` commands are run via `child_process.execFile` (not `exec`) to prevent shell injection.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port (only in `--http` mode) |
| `FLY_API_TOKEN` | — | Fly.io API token (needed in Docker/remote — locally uses `flyctl auth`) |

## Troubleshooting

**"flyctl not found"**
Ensure `flyctl` is installed and on your `PATH`. Install it from https://fly.io/docs/flyctl/install/

**"not authenticated"**
Run `flyctl auth login` to authenticate. For Docker/remote, set the `FLY_API_TOKEN` environment variable.

**Logs are empty**
The app may not have recent log output in the buffer. Logs are fetched with `--no-tail` which returns only buffered (recent) logs.

**Timeout errors**
Log fetching has a 15-second timeout. Status and app listing have 30-second timeouts. If your Fly.io account has many apps or verbose logs, these may need adjustment in `src/flyctl.ts`.

## License

MIT
