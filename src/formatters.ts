// Formatters — markdown tables and CSV output for land use, HDB, and amenities.

import { LandParcel, HdbResaleRecord, NearbyAmenity } from "./types.js";

// --- Markdown tables ---

export function formatLandParcelsTable(parcels: LandParcel[]): string {
  if (parcels.length === 0) {
    return "No land parcels found in this area.";
  }

  const header = "| Land Use | Plot Ratio | Region | Planning Area | Subzone |";
  const divider = "|---|---|---|---|---|";
  const rows = parcels.map(
    (p) =>
      `| ${p.landUse} | ${p.grossPlotRatio ?? "N/A"} | ${p.region} | ${p.planningArea} | ${p.subzone} |`
  );

  return [header, divider, ...rows].join("\n");
}

export function formatHdbTable(records: HdbResaleRecord[]): string {
  if (records.length === 0) {
    return "No HDB resale records found.";
  }

  const header =
    "| Month | Block | Street | Type | Storey | Area (sqm) | Price (SGD) | Lease Start | Remaining Lease |";
  const divider = "|---|---|---|---|---|---|---|---|---|";
  const rows = records.map(
    (r) =>
      `| ${r.month} | ${r.block} | ${r.streetName} | ${r.flatType} | ${r.storeyRange} | ${r.floorAreaSqm} | $${r.resalePrice.toLocaleString()} | ${r.leaseCommenceDate} | ${r.remainingLease} |`
  );

  return [header, divider, ...rows].join("\n");
}

// --- Nearby amenities ---

const CATEGORY_LABELS: Record<string, string> = {
  school: "School",
  hospital: "Hospital",
  clinic: "Clinic",
  food_court: "Food Court / Hawker",
  marketplace: "Market",
  park: "Park",
  mrt: "MRT/LRT Station",
  bus_stop: "Bus Stop",
  supermarket: "Supermarket",
  pharmacy: "Pharmacy",
};

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatNearbyAmenityTable(records: NearbyAmenity[]): string {
  if (records.length === 0) {
    return "No nearby amenities found matching your criteria.";
  }

  const header = "| Category | Name | Distance | Address |";
  const divider = "|---|---|---|---|";
  const rows = records.map((r) =>
    `| ${CATEGORY_LABELS[r.category] ?? r.category} | ${r.name} | ${formatDistance(r.distanceMeters)} | ${r.address ?? "—"} |`,
  );

  return [header, divider, ...rows].join("\n");
}

// --- CSV ---

/** Escape a value for CSV: wrap in quotes if it contains commas, quotes, or newlines. */
function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatLandParcelsCsv(parcels: LandParcel[]): string {
  const header = "Land Use,Plot Ratio,Region,Planning Area,Subzone";
  const rows = parcels.map(
    (p) =>
      [p.landUse, p.grossPlotRatio ?? "N/A", p.region, p.planningArea, p.subzone]
        .map(csvEscape)
        .join(","),
  );
  return [header, ...rows].join("\n");
}

export function formatHdbCsv(records: HdbResaleRecord[]): string {
  const header =
    "Month,Block,Street,Flat Type,Storey Range,Floor Area (sqm),Resale Price (SGD),Flat Model,Lease Start,Remaining Lease";
  const rows = records.map(
    (r) =>
      [
        r.month,
        r.block,
        r.streetName,
        r.flatType,
        r.storeyRange,
        r.floorAreaSqm,
        String(r.resalePrice),
        r.flatModel,
        r.leaseCommenceDate,
        r.remainingLease,
      ]
        .map(csvEscape)
        .join(","),
  );
  return [header, ...rows].join("\n");
}

export function formatNearbyAmenityCsv(records: NearbyAmenity[]): string {
  const header = "Category,Name,Distance (m),Latitude,Longitude,Address";
  const rows = records.map((r) =>
    [
      CATEGORY_LABELS[r.category] ?? r.category,
      r.name,
      String(r.distanceMeters),
      String(r.lat),
      String(r.lon),
      r.address ?? "",
    ].map(csvEscape).join(","),
  );
  return [header, ...rows].join("\n");
}
