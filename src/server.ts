// McpServer singleton for stdio transport.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_NAME, SERVER_VERSION } from "./config.js";
import { SessionState } from "./state.js";

/** Singleton server instance. */
export const server = new McpServer(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { logging: {} } },
);

/** Singleton state. */
export const state = new SessionState();
