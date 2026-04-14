// Per-session state management.
// Stores the last search result so analyze_results and export tools can access it.
// No persistence — resets on server restart.

import { SearchState } from "./types.js";

export class SessionState {
  private lastSearch: SearchState | null = null;
  private searchCount = 0;
  private readonly startTime = Date.now();

  getLastSearch(): SearchState | null {
    return this.lastSearch;
  }

  setLastSearch(state: SearchState): void {
    this.lastSearch = state;
    this.searchCount++;
  }

  getSearchCount(): number {
    return this.searchCount;
  }

  getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}
