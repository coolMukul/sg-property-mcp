#!/usr/bin/env node

// sg-property-mcp — Singapore property, land use, and amenities MCP server.
// Zero API keys required. Stdio transport only.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { SERVER_NAME, SERVER_VERSION } from "./config.js";
import { server, state } from "./server.js";
import { registerSearchTools } from "./tools/search.js";
import { registerAnalyzeTools } from "./tools/analyze.js";
import { registerExportTools } from "./tools/export.js";
import { registerAmenityTools } from "./tools/amenities.js";
import { registerAttributionTools } from "./tools/attribution.js";
import { registerResources } from "./resources.js";

async function main() {
  registerSearchTools(server, state);
  registerAnalyzeTools(server, state);
  registerExportTools(server, state);
  registerAmenityTools(server, state);
  registerAttributionTools(server);
  registerResources(server, state);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
