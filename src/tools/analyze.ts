// Analyze tool — uses MCP sampling to ask the client's LLM for insights.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { SAMPLING_MAX_TOKENS } from "../config.js";
import { SessionState } from "../state.js";
import { LandParcel, HdbResaleRecord, NearbyAmenity, SearchState } from "../types.js";
import {
  formatLandParcelsTable, formatHdbTable, formatNearbyAmenityTable,
} from "../formatters.js";
import { type ToolExtra, logInfo } from "../helpers.js";

/**
 * Build a system prompt and user message for the analyze_results tool.
 * Tailored to the search type.
 */
function buildAnalysisPrompt(
  search: SearchState,
  question?: string,
): { systemPrompt: string; userMessage: string } {
  let dataTable: string;
  let systemPrompt: string;

  switch (search.type) {
    case "land-use":
      dataTable = formatLandParcelsTable(search.results as LandParcel[]);
      systemPrompt = [
        "You are a Singapore urban planning analyst. Analyze the provided land use data. Base all conclusions strictly on the data given — do not assume zoning rules or regulations not evident from the results.",
        "",
        "Cover:",
        "1. **Dominant uses** — what land use types appear most, and what this signals about the area's character",
        "2. **Development density** — interpret gross plot ratios (>2.5 = high-density, 1.4-2.5 = medium, <1.4 = low)",
        "3. **Zoning mix** — is this a single-use zone or mixed? What does the residential/commercial/industrial balance suggest?",
        "4. **Notable observations** — anything unusual (e.g. reserve sites, special use, white sites)",
        "",
        "Keep the analysis to 3-5 short paragraphs. Use the search parameters to contextualize (radius, location).",
      ].join("\n");
      break;
    case "nearby-amenities":
      dataTable = formatNearbyAmenityTable(search.results as NearbyAmenity[]);
      systemPrompt = [
        "You are a Singapore neighborhood analyst. Analyze the provided nearby amenities data. Base all conclusions strictly on the data given.",
        "",
        "Cover:",
        "1. **Transport access** — MRT/LRT stations within 500m are excellent, 500m-1km is acceptable; note bus stop coverage",
        "2. **Daily essentials** — supermarkets, food courts/hawker centres, clinics, pharmacies — are basics within walking distance (<500m)?",
        "3. **Family-friendliness** — schools, parks, hospitals nearby",
        "4. **Coverage gaps** — important amenity categories that are missing or far away",
        "5. **Overall livability verdict** — one sentence summary",
        "",
        "Distance matters: group observations by walkable (<500m), nearby (500m-1km), and distant (>1km). Keep the analysis to 3-5 short paragraphs.",
      ].join("\n");
      break;
    default:
      dataTable = formatHdbTable(search.results as HdbResaleRecord[]);
      systemPrompt = [
        "You are a Singapore property market analyst. Analyze the provided HDB resale transaction data. Base all conclusions strictly on the data given.",
        "",
        "Cover:",
        "1. **Price range** — min, max, median prices; calculate and compare price per square foot (PSF = price / (area_sqm x 10.764)) where possible",
        "2. **Price drivers** — how do flat type, storey range, and floor area correlate with price?",
        "3. **Lease impact** — note remaining lease durations; leases below 60 years significantly affect financing eligibility in Singapore",
        "4. **Time patterns** — if multiple months are present, note any price movement",
        "5. **Key takeaway** — one sentence on what stands out",
        "",
        "Keep the analysis to 3-5 short paragraphs. This is informational analysis, not financial advice.",
      ].join("\n");
      break;
  }

  const queryLines = Object.entries(search.query)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  let userMessage = [
    `Search parameters:\n${queryLines}`,
    `Search performed: ${search.timestamp}`,
    `Total results: ${search.results.length}`,
    `\nData:\n${dataTable}`,
  ].join("\n");

  if (question) {
    userMessage += `\n\nUser's specific question: ${question}`;
  }

  return { systemPrompt, userMessage };
}

export function registerAnalyzeTools(server: McpServer, state: SessionState): void {
  // Guard against sampling cycles
  let isSampling = false;

  server.tool(
    "analyze_results",
    "Analyze the last search results using AI. Provides insights, patterns, and summaries. Best used after a search returns results — works with land use, HDB resale, and amenity data.",
    {
      question: z
        .string()
        .optional()
        .describe(
          "Optional focus for the analysis (e.g. 'which areas are most dense?', 'what is the price trend?')",
        ),
    },
    async ({ question }, extra: ToolExtra) => {
      await logInfo(extra, `analyze_results: question=${question ?? "(general analysis)"}`);

      if (isSampling) {
        await logInfo(extra, "analyze_results: blocked re-entrant call (sampling cycle prevented)");
        return {
          content: [
            {
              type: "text" as const,
              text: "Analysis is already in progress. This tool cannot be called recursively.",
            },
          ],
        };
      }

      const lastSearch = state.getLastSearch();
      if (!lastSearch) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No search results to analyze. Run a search tool first (e.g. search_area, search_hdb_resale).",
            },
          ],
        };
      }

      if (lastSearch.results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "The last search returned no results \u2014 nothing to analyze.",
            },
          ],
        };
      }

      const { systemPrompt, userMessage } = buildAnalysisPrompt(lastSearch, question);
      await logInfo(
        extra,
        `analyze_results: requesting analysis for ${lastSearch.type} data (${lastSearch.results.length} results)`,
      );

      isSampling = true;
      try {
        const result = await server.server.createMessage({
          messages: [
            {
              role: "user",
              content: { type: "text", text: userMessage },
            },
          ],
          systemPrompt,
          includeContext: "none",
          maxTokens: SAMPLING_MAX_TOKENS,
        });

        const analysisText =
          result.content.type === "text"
            ? result.content.text
            : "The analysis returned non-text content.";

        await logInfo(extra, "analyze_results: analysis complete");

        const headings: Record<string, string> = {
          "land-use": "Land Use",
          "hdb-resale": "HDB Resale",
          "nearby-amenities": "Nearby Amenities",
        };
        const heading = headings[lastSearch.type] ?? "Search";

        return {
          content: [
            {
              type: "text" as const,
              text: `**Analysis of ${heading} Results**\n\n${analysisText}`,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await logInfo(extra, `analyze_results: sampling failed \u2014 ${message}`);

        return {
          content: [
            {
              type: "text" as const,
              text: "Could not analyze results \u2014 the client may not support AI-assisted analysis. Try reviewing the raw data in the last search results instead.",
            },
          ],
        };
      } finally {
        isSampling = false;
      }
    },
  );
}
