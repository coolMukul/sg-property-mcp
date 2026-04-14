// Search tools — search_area, search_area_by_coords, search_hdb_resale.
// Uses Nominatim (free, no key) for geocoding.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  RADIUS_MIN,
  RADIUS_MAX,
  RADIUS_DEFAULT,
  HDB_LIMIT_DEFAULT,
} from "../config.js";
import { geocodeAddress } from "../api/nominatim.js";
import { queryLandUse } from "../api/arcgis.js";
import { queryHdbResale } from "../api/datagov.js";
import { SessionState } from "../state.js";
import { formatLandParcelsTable, formatHdbTable } from "../formatters.js";
import { type ToolExtra, clampRadius, sendProgress, logInfo } from "../helpers.js";

const GEOCODE_ATTRIBUTION = "Geocoding: Data (c) OpenStreetMap contributors";
const LAND_USE_ATTRIBUTION = "Land use: (c) Urban Redevelopment Authority";

export function registerSearchTools(server: McpServer, state: SessionState): void {
  server.tool(
    "search_area",
    "Search land use and zoning info near a Singapore address. Resolves the address to coordinates, then finds nearby land parcels with zoning details.",
    {
      address: z.string().describe("Singapore address to search (e.g. 'Ang Mo Kio Ave 3')"),
      radiusMeters: z
        .number()
        .optional()
        .default(RADIUS_DEFAULT)
        .describe(`Search radius in meters (${RADIUS_MIN}-${RADIUS_MAX}, default ${RADIUS_DEFAULT})`),
    },
    async ({ address, radiusMeters }, extra: ToolExtra) => {
      const radius = clampRadius(radiusMeters);
      await logInfo(extra, `search_area: address="${address}", radius=${radius}m`);

      // Step 1: Geocode the address
      await sendProgress(extra, 0, 3, "Resolving address\u2026");
      const waitCb = () => logInfo(extra, "search_area: waiting for geocoding service\u2026");
      const geo = await geocodeAddress(address, waitCb);

      if (!geo) {
        await logInfo(extra, `search_area: geocoding failed for "${address}"`);
        return {
          content: [
            {
              type: "text" as const,
              text: `Could not find the address "${address}". Try being more specific (e.g. include "Singapore" or a postal code).`,
            },
          ],
        };
      }
      await logInfo(extra, `search_area: geocoded to (${geo.lat}, ${geo.lon})`);

      // Step 2: Query land use
      await sendProgress(extra, 1, 3, "Fetching land use data\u2026");
      const parcels = await queryLandUse(geo.lat, geo.lon, radius);
      await logInfo(extra, `search_area: found ${parcels.length} land parcels`);

      // Step 3: Format results and store state
      await sendProgress(extra, 2, 3, "Formatting results\u2026");
      state.setLastSearch({
        type: "land-use",
        query: { address, lat: geo.lat, lon: geo.lon, radiusMeters: radius },
        results: parcels,
        timestamp: new Date().toISOString(),
      });

      const table = formatLandParcelsTable(parcels);
      const attribution = `\n\n---\n${GEOCODE_ATTRIBUTION}\n${LAND_USE_ATTRIBUTION}`;

      await sendProgress(extra, 3, 3, "Done");
      return {
        content: [
          {
            type: "text" as const,
            text: `**Land use near "${geo.displayName}"** (${radius}m radius)\n\n${table}${attribution}`,
          },
        ],
      };
    }
  );

  server.tool(
    "search_area_by_coords",
    "Search land use and zoning info near specific coordinates. Skips geocoding \u2014 use when you already have lat/lon.",
    {
      latitude: z.number().describe("Latitude (WGS84)"),
      longitude: z.number().describe("Longitude (WGS84)"),
      radiusMeters: z
        .number()
        .optional()
        .default(RADIUS_DEFAULT)
        .describe(`Search radius in meters (${RADIUS_MIN}-${RADIUS_MAX}, default ${RADIUS_DEFAULT})`),
    },
    async ({ latitude, longitude, radiusMeters }, extra: ToolExtra) => {
      const radius = clampRadius(radiusMeters);
      await logInfo(extra, `search_area_by_coords: (${latitude}, ${longitude}), radius=${radius}m`);

      const parcels = await queryLandUse(latitude, longitude, radius);
      await logInfo(extra, `search_area_by_coords: found ${parcels.length} land parcels`);

      state.setLastSearch({
        type: "land-use",
        query: { lat: latitude, lon: longitude, radiusMeters: radius },
        results: parcels,
        timestamp: new Date().toISOString(),
      });

      const table = formatLandParcelsTable(parcels);
      const attribution = `\n\n---\n${LAND_USE_ATTRIBUTION}`;

      return {
        content: [
          {
            type: "text" as const,
            text: `**Land use near (${latitude}, ${longitude})** (${radius}m radius)\n\n${table}${attribution}`,
          },
        ],
      };
    }
  );

  server.tool(
    "search_hdb_resale",
    "Search HDB resale flat transactions by town and optional flat type. Data covers 2017 onwards, sorted by most recent. Returns price, floor area, storey, lease, and location details.",
    {
      town: z
        .string()
        .describe("HDB town name in uppercase (e.g. 'ANG MO KIO', 'BEDOK', 'TAMPINES', 'WOODLANDS', 'PUNGGOL', 'SENGKANG'). Must match official HDB town names exactly — invalid names return empty results."),
      flatType: z
        .string()
        .optional()
        .describe("Flat type filter (e.g. '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE')"),
      limit: z
        .number()
        .optional()
        .default(HDB_LIMIT_DEFAULT)
        .describe(`Max results to return (default ${HDB_LIMIT_DEFAULT})`),
    },
    async ({ town, flatType, limit }, extra: ToolExtra) => {
      await logInfo(extra, `search_hdb_resale: town="${town}", flatType=${flatType ?? "any"}, limit=${limit}`);

      const { records, total, error } = await queryHdbResale(town, flatType, limit, () =>
        logInfo(extra, "search_hdb_resale: connecting to data service\u2026"),
      );

      if (error) {
        await logInfo(extra, `search_hdb_resale: API error \u2014 ${error}`);
        return {
          content: [{ type: "text" as const, text: error }],
        };
      }

      await logInfo(extra, `search_hdb_resale: returning ${records.length} of ${total} records`);

      state.setLastSearch({
        type: "hdb-resale",
        query: { town, flatType: flatType ?? null, limit },
        results: records,
        timestamp: new Date().toISOString(),
      });

      const table = formatHdbTable(records);
      const summary =
        records.length > 0
          ? `Showing ${records.length} of ${total.toLocaleString()} total records.`
          : "";
      const attribution =
        "\n\n---\nContains information from data.gov.sg accessed under the Singapore Open Data Licence";

      return {
        content: [
          {
            type: "text" as const,
            text: `**HDB Resale \u2014 ${town}${flatType ? ` (${flatType})` : ""}**\n\n${summary}\n\n${table}${attribution}`,
          },
        ],
      };
    }
  );
}
