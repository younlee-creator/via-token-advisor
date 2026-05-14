import { TokenRecord } from "./types.js";
import { rankTokens } from "./ranking.js";

export interface ExplainResult {
  found: true;
  token: {
    id: string;
    path: string;
    kind: "color" | "typography-style";
    description: string;
    notFor: string[];
    pairWith: string[];
    lightValue: string | null;
    darkValue: string | null;
    cssVar: string | null;
    recommend: boolean;
  };
  alternatives: Array<{ path: string; description: string }>;
}

export interface ExplainNotFound {
  found: false;
  message: string;
  suggestions: Array<{ path: string; description: string }>;
}

// ── Identifier normalization ────────────────────────────────────────────────
//
// Accepts any of:
//   text/secondary              → token path (canonical)
//   color-text-secondary        → CSS var suffix
//   --color-light-text-secondary → full CSS var
//   color.text.secondary        → record id
//   secondary text              → loose words (fuzzy fallback)

function normalizeIdentifier(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^var\(/, "")
    .replace(/\)$/, "")
    .replace(/^--color-(light|dark)-/, "")
    .replace(/^--/, "")
    .replace(/\./g, "/")
    .replace(/-/g, "/");
}

// ── "pair with" extraction ──────────────────────────────────────────────────
//
// Pulls the companion-token guidance already embedded in description prose.
// Looks for sentences containing "pair with" and extracts any token-like
// names (words that include "/" or end with a semantic suffix).

function extractPairWith(description: string): string[] {
  const pairs: string[] = [];
  const sentences = description.split(/(?<=[.;])\s+/);
  for (const sentence of sentences) {
    if (!sentence.toLowerCase().includes("pair with")) continue;
    // Extract quoted or italicized token names, then fall back to word scan
    const tokenPattern = /\b((?:text|background|border|icon|fill)\/[a-z][a-z0-9\s-]*[a-z0-9])\b/gi;
    const matches = sentence.match(tokenPattern);
    if (matches) {
      for (const m of matches) {
        const normalized = m.toLowerCase().trim();
        if (!pairs.includes(normalized)) pairs.push(normalized);
      }
    } else {
      // Fallback: grab the phrase after "pair with"
      const after = sentence.toLowerCase().replace(/.*pair with\s+/i, "").replace(/[.;].*/, "").trim();
      if (after && !pairs.includes(after)) pairs.push(after);
    }
  }
  return pairs;
}

// ── notFor fallback ─────────────────────────────────────────────────────────
//
// When a token has no authored notFor, extract "do not use" sentences from
// the description so the tool is still useful.

function extractNotFor(description: string): string[] {
  const results: string[] = [];
  const sentences = description.split(/(?<=[.;])\s+/);
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (lower.includes("do not use") || lower.includes("don't use") || lower.includes("avoid")) {
      results.push(sentence.trim());
    }
  }
  return results;
}

// ── Main lookup ─────────────────────────────────────────────────────────────

export function explainToken(
  records: TokenRecord[],
  identifier: string
): ExplainResult | ExplainNotFound {
  const normalized = normalizeIdentifier(identifier);

  // 1. Exact path match
  let match = records.find((r) => r.path.toLowerCase() === normalized);

  // 2. Exact id match (e.g. "color.text.secondary")
  if (!match) {
    match = records.find((r) => r.id.toLowerCase() === normalizeIdentifier(identifier).replace(/\//g, "."));
  }

  // 3. Partial path match (e.g. "secondary" → "text/secondary" if unambiguous)
  if (!match) {
    const partialMatches = records.filter((r) =>
      r.path.toLowerCase().endsWith(`/${normalized}`) ||
      r.path.toLowerCase() === normalized ||
      r.id.toLowerCase().endsWith(`.${normalized.replace(/\//g, ".")}`)
    );
    if (partialMatches.length === 1) {
      match = partialMatches[0];
    }
  }

  // 4. Fuzzy ranking fallback
  if (!match) {
    const ranked = rankTokens(records, identifier, { limit: 5 });
    if (ranked.length === 0) {
      return {
        found: false,
        message: `No Via token matched "${identifier}". Try using the token path directly (e.g. "text/secondary") or search with search_tokens.`,
        suggestions: [],
      };
    }

    // If top score is dominant, treat it as the match
    const top = ranked[0];
    const second = ranked[1];
    if (!second || top.score >= second.score * 1.4) {
      match = top.record;
    } else {
      return {
        found: false,
        message: `"${identifier}" is ambiguous. Did you mean one of these?`,
        suggestions: ranked.slice(0, 4).map((r) => ({
          path: r.record.path,
          description: r.record.description,
        })),
      };
    }
  }

  // Build alternatives: similar tokens in the same category, excluding the match
  const alternatives = rankTokens(records, match.path, { limit: 6 })
    .filter((r) => r.record.id !== match!.id)
    .slice(0, 3)
    .map((r) => ({ path: r.record.path, description: r.record.description }));

  const notFor =
    match.notFor && match.notFor.length > 0
      ? match.notFor
      : extractNotFor(match.description);

  const pairWith = extractPairWith(match.description);

  const lightValue = match.modeValues?.light?.value ?? null;
  const darkValue = match.modeValues?.dark?.value ?? null;
  const cssVar = (match as any).css?.var ?? null;

  return {
    found: true,
    token: {
      id: match.id,
      path: match.path,
      kind: match.kind,
      description: match.description,
      notFor,
      pairWith,
      lightValue,
      darkValue,
      cssVar,
      recommend: match.recommend,
    },
    alternatives,
  };
}
