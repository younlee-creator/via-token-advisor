import { TokenRecord } from "./types";

// ── Types ────────────────────────────────────────────────────

export interface AuditMatch {
  kind: "color" | "spacing";
  raw: string;
  normalized: string;
  index: number;
  /** Number of occurrences in the pasted code */
  length: number;
  tokens: TokenRecord[];
  /** For color: which mode the hex appears in */
  mode: "light" | "dark" | "both" | null;
  /** For spacing: the Via CSS var suggestion */
  spacingVar?: string;
}

export interface AuditResult {
  matches: AuditMatch[];
  colorMatches: number;
  spacingMatches: number;
  uniqueValues: number;
  totalOccurrences: number;
}

// ── Spacing lookup (from tokens.css) ─────────────────────────
// Maps a raw pixel value (as integer) to the Via CSS variable name.

const SPACING_MAP: Record<number, string> = {
  0:    "--space-000",
  1:    "--space-025",
  2:    "--space-050",
  4:    "--space-100",
  6:    "--space-150",
  8:    "--space-200",
  12:   "--space-300",
  16:   "--space-400",
  24:   "--space-600",
  32:   "--space-800",
  36:   "--space-900",
  40:   "--space-1000",
  48:   "--space-1200",
  56:   "--space-1400",
  64:   "--space-1600",
  72:   "--space-1800",
};

// px values that are almost always intentional border widths — skip them
const SPACING_SKIP = new Set([1, 2, 3]);

// CSS properties that carry spacing values (skip font-size, border-radius, etc.)
const SPACING_PROPERTIES = new Set([
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "gap", "row-gap", "column-gap",
  "top", "right", "bottom", "left",
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "inset", "inset-block", "inset-inline",
]);

// ── Regexes ──────────────────────────────────────────────────

const HEX_RE = /#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;

// Match px values that are preceded by a spacing property name or a colon/space
// We capture the preceding property context to filter noise
const PX_RE = /(?:^|[\s;{,\n])(\w[\w-]*):\s*[^;{]*?\b(\d+)px\b/gm;

// ── Color utilities ──────────────────────────────────────────

function normalizeHex(hex: string): string {
  const h = hex.slice(1);
  if (h.length === 3) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
  }
  return `#${h.slice(0, 6).toUpperCase()}`;
}

function buildHexIndex(records: TokenRecord[]): Map<
  string,
  Array<{ record: TokenRecord; mode: "light" | "dark" }>
> {
  const index = new Map<string, Array<{ record: TokenRecord; mode: "light" | "dark" }>>();
  for (const record of records) {
    if (record.kind !== "color" || !record.modeValues) continue;
    for (const [modeName, mv] of Object.entries(record.modeValues)) {
      if (!mv.value.startsWith("#")) continue;
      const norm = normalizeHex(mv.value);
      const mode = modeName === "light" ? "light" : "dark";
      const existing = index.get(norm) ?? [];
      existing.push({ record, mode });
      index.set(norm, existing);
    }
  }
  return index;
}

// ── Audit ────────────────────────────────────────────────────

export function auditCode(code: string, records: TokenRecord[]): AuditResult {
  const hexIndex = buildHexIndex(records);
  const colorMap = new Map<string, AuditMatch>();
  const spacingMap = new Map<string, AuditMatch>();
  const allMatches: AuditMatch[] = [];

  // ── Color pass ──
  const hexRe = new RegExp(HEX_RE.source, "g");
  let match: RegExpExecArray | null;

  while ((match = hexRe.exec(code)) !== null) {
    const raw = match[0];
    const norm = normalizeHex(raw);
    const existing = colorMap.get(norm);
    if (existing) { existing.length++; continue; }

    const hits = hexIndex.get(norm) ?? [];
    const tokenMatches = hits.map((h) => h.record);
    const modes = [...new Set(hits.map((h) => h.mode))];
    const mode: AuditMatch["mode"] =
      hits.length === 0 ? null
      : modes.length === 2 ? "both"
      : modes[0] === "light" ? "light" : "dark";

    const entry: AuditMatch = {
      kind: "color",
      raw,
      normalized: norm,
      index: match.index,
      length: 1,
      tokens: tokenMatches,
      mode,
    };
    colorMap.set(norm, entry);
    allMatches.push(entry);
  }

  // ── Spacing pass ──
  const pxRe = new RegExp(PX_RE.source, "gm");

  while ((match = pxRe.exec(code)) !== null) {
    const propName = match[1].toLowerCase();
    const pxValue = parseInt(match[2], 10);

    if (!SPACING_PROPERTIES.has(propName)) continue;
    if (SPACING_SKIP.has(pxValue)) continue;

    const norm = `${pxValue}px`;
    const existing = spacingMap.get(norm);
    if (existing) { existing.length++; continue; }

    const spacingVar = SPACING_MAP[pxValue];

    const entry: AuditMatch = {
      kind: "spacing",
      raw: `${pxValue}px`,
      normalized: norm,
      index: match.index,
      length: 1,
      tokens: [],
      mode: null,
      spacingVar,
    };
    spacingMap.set(norm, entry);
    allMatches.push(entry);
  }

  // Sort: unmatched colors first, then matched colors, then spacing
  allMatches.sort((a, b) => {
    if (a.kind === "color" && b.kind === "spacing") return -1;
    if (a.kind === "spacing" && b.kind === "color") return 1;
    if (a.kind === "color" && b.kind === "color") {
      if (a.tokens.length === 0 && b.tokens.length > 0) return -1;
      if (a.tokens.length > 0 && b.tokens.length === 0) return 1;
    }
    return b.length - a.length;
  });

  return {
    matches: allMatches,
    colorMatches: [...colorMap.values()].filter((m) => m.tokens.length > 0).length,
    spacingMatches: [...spacingMap.values()].filter((m) => m.spacingVar).length,
    uniqueValues: colorMap.size + spacingMap.size,
    totalOccurrences: allMatches.reduce((s, m) => s + m.length, 0),
  };
}

/** Apply token suggestions to produce a "after" version of the code. */
export function applyTokenSuggestions(
  code: string,
  matches: AuditMatch[]
): string {
  let result = code;

  for (const m of matches) {
    if (m.kind === "color") {
      if (m.tokens.length === 0) continue;
      const best = m.tokens.find((t) => t.recommend) ?? m.tokens[0];
      const varName = `--color-light-${best.path.replace(/\//g, "-")}`;
      result = result.replaceAll(m.raw, `var(${varName})`);
    } else if (m.kind === "spacing" && m.spacingVar) {
      result = result.replace(
        new RegExp(`(?<=[:\\s,])${m.raw}(?=[\\s;,}])`, "g"),
        `var(${m.spacingVar})`
      );
    }
  }
  return result;
}
