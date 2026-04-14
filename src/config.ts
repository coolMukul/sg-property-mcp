// Central configuration — API URLs, defaults, and constants.
// All endpoints are free, zero-key APIs verified working April 2026.

function envInt(key: string, fallback: number): number {
  const val = process.env[key];
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
}

export const SERVER_NAME = "sg-property";
export const SERVER_VERSION = "0.1.0";

export const USER_AGENT = process.env.USER_AGENT || "SG-Property-MCP/0.1.0";

// Nominatim (OpenStreetMap) — geocoding
export const NOMINATIM_URL =
  process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org/search";

// URA ArcGIS — Master Plan 2019 land use spatial query
export const ARCGIS_LAND_USE_URL =
  process.env.ARCGIS_LAND_USE_URL ||
  "https://maps.ura.gov.sg/arcgis/rest/services/MP19/Updated_Landuse_gaz/MapServer/24/query";

// data.gov.sg — HDB resale flat prices (2017 onwards)
export const DATAGOV_URL =
  process.env.DATAGOV_URL || "https://data.gov.sg/api/action/datastore_search";
export const HDB_RESALE_RESOURCE_ID =
  process.env.HDB_RESALE_RESOURCE_ID || "f1765b54-a209-4718-8d38-a39237f502b3";

// Overpass API (OpenStreetMap) — nearby amenities
export const OVERPASS_URL =
  process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";

// Radius bounds for spatial queries (meters)
export const RADIUS_MIN = envInt("RADIUS_MIN", 10);
export const RADIUS_MAX = envInt("RADIUS_MAX", 5000);
export const RADIUS_DEFAULT = envInt("RADIUS_DEFAULT", 100);

// Default result limits
export const HDB_LIMIT_DEFAULT = envInt("HDB_LIMIT_DEFAULT", 10);
export const ARCGIS_RESULT_LIMIT = envInt("ARCGIS_RESULT_LIMIT", 50);

// Sampling defaults (analyze_results tool)
export const SAMPLING_MAX_TOKENS = envInt("SAMPLING_MAX_TOKENS", 2048);
