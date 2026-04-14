# sg-property-mcp

**Singapore property prices, land use, and neighborhood amenities via MCP — no API keys needed.**

An [MCP](https://modelcontextprotocol.io/) server for Singapore property research. Works out of the box with zero configuration.

## What it does

| Tool | Description |
|------|-------------|
| **search_area** | Land use and zoning info near a Singapore address |
| **search_area_by_coords** | Same as above, using coordinates directly |
| **search_hdb_resale** | Recent HDB resale flat prices by town (2017 onwards) |
| **search_nearby_amenities** | Schools, MRT, parks, hawker centres, hospitals within a radius |
| **analyze_results** | AI-powered analysis of your last search |
| **export_csv** / **export_md** | Save results to CSV or Markdown files |

**8 tools. Zero API keys. Just works.**

## Quick start

### Desktop app

Add to your MCP client config:

```json
{
  "mcpServers": {
    "sg-property": {
      "command": "npx",
      "args": ["-y", "sg-property-mcp"]
    }
  }
}
```

### CLI (MCP-compatible)

```bash
# Example for CLI tools that support MCP:
npx sg-property-mcp
```

### Manual install

```bash
npm install -g sg-property-mcp
```

Then add to your MCP client config:

```json
{
  "mcpServers": {
    "sg-property": {
      "command": "sg-property-mcp"
    }
  }
}
```

## Example conversations

> **"What's the land use around Bishan MRT?"**
> → `search_area` returns zoning types, plot ratios, planning areas

> **"Show me recent 4-room HDB prices in Tampines"**
> → `search_hdb_resale` returns transactions with prices, block, storey, lease info

> **"What amenities are within 500m of 1.3521, 103.8198?"**
> → `search_nearby_amenities` finds schools, MRT stations, parks, hawker centres with distances

> **"Analyze the price patterns in those results"**
> → `analyze_results` provides AI-generated insights on pricing trends

## Data sources

All data comes from free, public APIs. No registration or API keys required.

- Land use zoning — (c) Urban Redevelopment Authority
- HDB resale prices — Contains information from data.gov.sg accessed under the Singapore Open Data Licence
- Geocoding & amenities — Data (c) OpenStreetMap contributors

## Requirements

- Node.js 20.6 or later
- An MCP-compatible client (any MCP desktop app or CLI)

## License

MIT
