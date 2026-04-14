// Export tools — export_csv and export_md. Write files to client-approved directories (roots).

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { SessionState } from "../state.js";
import { LandParcel, HdbResaleRecord, NearbyAmenity } from "../types.js";
import {
  formatLandParcelsTable, formatHdbTable, formatNearbyAmenityTable,
  formatLandParcelsCsv, formatHdbCsv, formatNearbyAmenityCsv,
} from "../formatters.js";
import { isPathAllowed } from "../roots.js";
import { type ToolExtra, logInfo } from "../helpers.js";

const DATA_TYPE_LABELS: Record<string, string> = {
  "land-use": "land parcel",
  "hdb-resale": "HDB resale",
  "nearby-amenities": "nearby amenity",
};

const ATTRIBUTION_MAP: Record<string, string> = {
  "land-use": "Geocoding: Data (c) OpenStreetMap contributors\nLand use: (c) Urban Redevelopment Authority",
  "hdb-resale": "Contains information from data.gov.sg accessed under the Singapore Open Data Licence",
  "nearby-amenities": "Data (c) OpenStreetMap contributors",
};

const HEADING_MAP: Record<string, string> = {
  "land-use": "Land Use Results",
  "hdb-resale": "HDB Resale Results",
  "nearby-amenities": "Nearby Amenities",
};

export function registerExportTools(server: McpServer, state: SessionState): void {
  server.tool(
    "export_csv",
    "Export the last search results to a CSV file. The file must be saved within a directory approved by the client.",
    {
      filePath: z
        .string()
        .describe("Full path for the CSV file (e.g. '/home/user/exports/results.csv')"),
    },
    async ({ filePath }, extra: ToolExtra) => {
      await logInfo(extra, `export_csv: target="${filePath}"`);

      const lastSearch = state.getLastSearch();
      if (!lastSearch) {
        return { content: [{ type: "text" as const, text: "No search results to export. Run a search first." }] };
      }
      if (lastSearch.results.length === 0) {
        return { content: [{ type: "text" as const, text: "The last search returned no results \u2014 nothing to export." }] };
      }

      const check = await isPathAllowed(server.server, filePath);
      if (!check.allowed) {
        await logInfo(extra, `export_csv: path denied \u2014 ${check.reason}`);
        const rootsList = check.roots.length > 0
          ? `\n\nAllowed directories:\n${check.roots.map((r) => `- ${r}`).join("\n")}`
          : "";
        return { content: [{ type: "text" as const, text: `Cannot write to "${filePath}". ${check.reason}${rootsList}` }] };
      }

      await logInfo(extra, `export_csv: path allowed (root: ${check.root})`);

      let csv: string;
      switch (lastSearch.type) {
        case "land-use":
          csv = formatLandParcelsCsv(lastSearch.results as LandParcel[]); break;
        case "nearby-amenities":
          csv = formatNearbyAmenityCsv(lastSearch.results as NearbyAmenity[]); break;
        default:
          csv = formatHdbCsv(lastSearch.results as HdbResaleRecord[]); break;
      }

      try {
        await mkdir(path.dirname(path.resolve(filePath)), { recursive: true });
        await writeFile(path.resolve(filePath), csv, "utf-8");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await logInfo(extra, `export_csv: write failed \u2014 ${message}`);
        return { content: [{ type: "text" as const, text: `Failed to write file: ${message}` }] };
      }

      const resolved = path.resolve(filePath);
      const rowCount = lastSearch.results.length;
      const dataType = DATA_TYPE_LABELS[lastSearch.type] ?? lastSearch.type;
      await logInfo(extra, `export_csv: wrote ${rowCount} ${dataType} records to ${resolved}`);

      return { content: [{ type: "text" as const, text: `Exported ${rowCount} ${dataType} records to:\n${resolved}` }] };
    },
  );

  server.tool(
    "export_md",
    "Export the last search results to a Markdown file. The file must be saved within a directory approved by the client.",
    {
      filePath: z
        .string()
        .describe("Full path for the Markdown file (e.g. '/home/user/exports/results.md')"),
    },
    async ({ filePath }, extra: ToolExtra) => {
      await logInfo(extra, `export_md: target="${filePath}"`);

      const lastSearch = state.getLastSearch();
      if (!lastSearch) {
        return { content: [{ type: "text" as const, text: "No search results to export. Run a search first." }] };
      }
      if (lastSearch.results.length === 0) {
        return { content: [{ type: "text" as const, text: "The last search returned no results \u2014 nothing to export." }] };
      }

      const check = await isPathAllowed(server.server, filePath);
      if (!check.allowed) {
        await logInfo(extra, `export_md: path denied \u2014 ${check.reason}`);
        const rootsList = check.roots.length > 0
          ? `\n\nAllowed directories:\n${check.roots.map((r) => `- ${r}`).join("\n")}`
          : "";
        return { content: [{ type: "text" as const, text: `Cannot write to "${filePath}". ${check.reason}${rootsList}` }] };
      }

      await logInfo(extra, `export_md: path allowed (root: ${check.root})`);

      let table: string;
      switch (lastSearch.type) {
        case "land-use":
          table = formatLandParcelsTable(lastSearch.results as LandParcel[]); break;
        case "nearby-amenities":
          table = formatNearbyAmenityTable(lastSearch.results as NearbyAmenity[]); break;
        default:
          table = formatHdbTable(lastSearch.results as HdbResaleRecord[]); break;
      }

      const queryLines = Object.entries(lastSearch.query)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `- **${k}:** ${v}`);
      const heading = HEADING_MAP[lastSearch.type] ?? "Results";
      const attribution = ATTRIBUTION_MAP[lastSearch.type] ?? "(c) Urban Redevelopment Authority";

      const exportedAt = new Date().toLocaleString(undefined, {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        timeZoneName: "short",
      });

      const md = [
        `# ${heading}`,
        "",
        `**Exported:** ${exportedAt}`,
        "",
        "## Query Parameters",
        "",
        ...queryLines,
        "",
        "## Results",
        "",
        table,
        "",
        "---",
        attribution,
        "",
      ].join("\n");

      try {
        await mkdir(path.dirname(path.resolve(filePath)), { recursive: true });
        await writeFile(path.resolve(filePath), md, "utf-8");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await logInfo(extra, `export_md: write failed \u2014 ${message}`);
        return { content: [{ type: "text" as const, text: `Failed to write file: ${message}` }] };
      }

      const resolved = path.resolve(filePath);
      const rowCount = lastSearch.results.length;
      const dataType = DATA_TYPE_LABELS[lastSearch.type] ?? lastSearch.type;
      await logInfo(extra, `export_md: wrote ${rowCount} ${dataType} records to ${resolved}`);

      return { content: [{ type: "text" as const, text: `Exported ${rowCount} ${dataType} records to:\n${resolved}` }] };
    },
  );
}
