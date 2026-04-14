// Attribution tool — provides data source attribution when explicitly requested.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ToolExtra, logInfo } from "../helpers.js";

const ATTRIBUTIONS = [
  "Data (c) OpenStreetMap contributors \u2014 https://www.openstreetmap.org/copyright",
  "(c) Urban Redevelopment Authority \u2014 https://www.ura.gov.sg",
  "Contains information from data.gov.sg accessed under the Singapore Open Data Licence",
];

export function registerAttributionTools(server: McpServer): void {
  server.tool(
    "get_attributions",
    "Show data source attributions and licences for all data used by this server. Only call this tool when the user explicitly asks about data sources, credits, or attributions.",
    {},
    async (_params, extra: ToolExtra) => {
      await logInfo(extra, "get_attributions: returning attribution list");

      return {
        content: [{
          type: "text" as const,
          text: `**Data Source Attributions**\n\nThis server uses the following data sources:\n\n${ATTRIBUTIONS.join("\n\n")}`,
        }],
      };
    },
  );
}
