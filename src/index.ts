#!/usr/bin/env node
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { AdvisorIndex, TokenRecord } from "./types.js";
import { rankTokens } from "./ranking.js";
import { explainToken } from "./explain.js";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load generated advisor index at startup
const indexPath = path.join(__dirname, "../data/generated/advisor-tokens.json");
const advisorIndex: AdvisorIndex = require(indexPath);
const records: TokenRecord[] = advisorIndex.records;

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRecord(record: TokenRecord): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: record.id,
    kind: record.kind,
    path: record.path,
    description: record.description,
    recommend: record.recommend,
  };

  if (record.kind === "color" && record.modeValues) {
    base.lightValue = record.modeValues.light?.value ?? null;
    base.lightAlias = record.modeValues.light?.alias ?? null;
    base.darkValue = record.modeValues.dark?.value ?? null;
    base.darkAlias = record.modeValues.dark?.alias ?? null;
  }

  if (record.kind === "typography-style") {
    base.name = record.name ?? record.path;
    base.cssVar = (record as any).css?.var ?? null;
    base.futureCssVar = (record as any).css?.futureVar ?? null;
    if (record.properties) {
      base.properties = record.properties;
    }
  }

  return base;
}

// ── Tool: search_tokens ───────────────────────────────────────────────────

function searchTokens(
  query: string,
  kind?: string,
  limit = 8
): TokenRecord[] {
  return rankTokens(records, query, {
    kind: kind as "color" | "typography-style" | undefined,
    limit,
    recommendOnly: false,
  }).map(({ record }) => record);
}

// ── Tool: recommend_tokens ────────────────────────────────────────────────

function recommendTokens(
  query: string,
  kind?: string,
  limit = 5
): TokenRecord[] {
  return rankTokens(records, query, {
    kind: kind as "color" | "typography-style" | undefined,
    limit,
    recommendOnly: true,
  }).map(({ record }) => record);
}

// ── MCP server ─────────────────────────────────────────────────────────────

const server = new Server(
  {
    name: "via-token-advisor",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_tokens",
      description:
        "Search Via design tokens and typography styles by intent or keyword. Returns matching tokens with descriptions, values, and usage guidance. Use this to find which token fits a given design need.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              'What you are looking for, e.g. "disabled button text", "main page background", "helper text near a form field"',
          },
          kind: {
            type: "string",
            enum: ["color", "typography-style"],
            description: "Optionally filter to only color tokens or only typography styles",
          },
          limit: {
            type: "number",
            description: "Max results to return (default 8, max 20)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "recommend_tokens",
      description:
        "Recommend the best Via design tokens or typography styles for a given design intent. Filters to recommended tokens only and ranks by best fit. Use this when you want an opinionated suggestion rather than a broad search.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              'The design intent you want tokens for, e.g. "error state in a form", "heading on a marketing page", "body text for a product UI"',
          },
          kind: {
            type: "string",
            enum: ["color", "typography-style"],
            description: "Optionally filter to only color tokens or only typography styles",
          },
          limit: {
            type: "number",
            description: "Max results to return (default 5)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "explain_token",
      description:
        "Explain a specific Via design token — what it is for, what it is NOT for, and what to use instead. Use this when you already have a token name and want to verify it is being used correctly, or when a designer is unsure whether their current token choice is appropriate for their context.",
      inputSchema: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description:
              'The token to explain. Accepts any of: token path (e.g. "text/secondary"), CSS var suffix (e.g. "color-text-secondary"), full CSS var (e.g. "--color-light-text-secondary"), or a loose name (e.g. "secondary text").',
          },
        },
        required: ["token"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "search_tokens") {
    const query = args?.query as string;
    const kind = args?.kind as string | undefined;
    const limit = Math.min(Number(args?.limit ?? 8), 20);

    const results = searchTokens(query, kind, limit);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No Via tokens matched "${query}". Try broader terms like "background", "text", "error", "disabled", or "heading".`,
          },
        ],
      };
    }

    const formatted = results.map(formatRecord);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { query, count: formatted.length, results: formatted },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "recommend_tokens") {
    const query = args?.query as string;
    const kind = args?.kind as string | undefined;
    const limit = Math.min(Number(args?.limit ?? 5), 10);

    const results = recommendTokens(query, kind, limit);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No recommended Via tokens matched "${query}". Try rephrasing or use search_tokens for a broader search.`,
          },
        ],
      };
    }

    const formatted = results.map(formatRecord);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { query, count: formatted.length, recommendations: formatted },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "explain_token") {
    const token = args?.token as string;
    if (!token?.trim()) {
      return {
        content: [{ type: "text", text: "Please provide a token name or path to explain." }],
      };
    }

    const result = explainToken(records, token);

    if (!result.found) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                found: false,
                message: result.message,
                suggestions: result.suggestions,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// ── Start ──────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
