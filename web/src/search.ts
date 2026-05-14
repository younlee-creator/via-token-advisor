import { TokenRecord } from "./types";
import { rankTokens } from "../../src/ranking";

interface SearchOptions {
  kind?: "color" | "typography-style";
  limit?: number;
  recommendOnly?: boolean;
}

export function searchTokens(
  records: TokenRecord[],
  query: string,
  options?: SearchOptions
): Array<{ record: TokenRecord; score: number; reasons: Array<{ label: string; points: number }> }> {
  return rankTokens(records, query, {
    kind: options?.kind,
    limit: options?.limit ?? 12,
    recommendOnly: options?.recommendOnly ?? false,
  });
}

export function recommendTokens(
  records: TokenRecord[],
  query: string,
  kind?: "color" | "typography-style",
  limit = 8
): Array<{ record: TokenRecord; score: number; reasons: Array<{ label: string; points: number }> }> {
  return searchTokens(records, query, {
    kind,
    recommendOnly: true,
    limit,
  });
}

/** Derive the CSS var name for a semantic color token. */
export function colorCssVar(path: string, mode: "light" | "dark"): string {
  return `--color-${mode}-${path.replace(/\//g, "-")}`;
}
