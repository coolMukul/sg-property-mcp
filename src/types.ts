// Shared interfaces for sg-property-mcp server.

/** Geocoding result from Nominatim */
export interface GeocodingResult {
  lat: number;
  lon: number;
  displayName: string;
}

/** A land parcel from URA ArcGIS Master Plan 2019 */
export interface LandParcel {
  landUse: string;
  grossPlotRatio: string | null;
  region: string;
  planningArea: string;
  subzone: string;
}

/** An HDB resale transaction from data.gov.sg */
export interface HdbResaleRecord {
  month: string;
  town: string;
  flatType: string;
  block: string;
  streetName: string;
  storeyRange: string;
  floorAreaSqm: string;
  flatModel: string;
  leaseCommenceDate: string;
  remainingLease: string;
  resalePrice: number;
}

/** A nearby amenity from Overpass API (OpenStreetMap) */
export interface NearbyAmenity {
  category: string;    // normalized: "school", "hospital", "clinic", "food_court", "park", "mrt", "bus_stop", "supermarket", "pharmacy", "marketplace"
  name: string;        // display name (from tags.name or "(unnamed)")
  lat: number;
  lon: number;
  distanceMeters: number;  // calculated from query center point
  address: string | null;  // from tags if available
  tags: Record<string, string>;  // raw OSM tags for additional info
}

/** Stored state for the last search performed */
export interface SearchState {
  type: "land-use" | "hdb-resale" | "nearby-amenities";
  query: Record<string, unknown>;
  results: LandParcel[] | HdbResaleRecord[] | NearbyAmenity[];
  timestamp: string;
}
