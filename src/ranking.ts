export interface RankableTokenRecord {
  id: string;
  kind: "color" | "typography-style";
  category: string;
  path: string;
  description: string;
  recommend: boolean;
  searchTerms: string[];
  componentTerms?: string[];
  componentPhrases?: string[];
  css?: { var: string | null; futureVar?: string | null };
}

export interface RankedToken<TRecord extends RankableTokenRecord = RankableTokenRecord> {
  record: TRecord;
  score: number;
  reasons: Array<{ label: string; points: number }>;
}

export interface RankOptions {
  kind?: "color" | "typography-style";
  limit?: number;
  recommendOnly?: boolean;
  confidenceRatio?: number;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "than",
  "that",
  "the",
  "this",
  "to",
  "use",
  "when",
  "where",
  "with",
]);

const TERM_ALIASES: Record<string, string[]> = {
  helper: ["supporting", "hint", "description", "caption"],
  error: ["invalid", "validation", "failed"],
  disabled: ["inactive", "readonly", "read", "only"],
  text: ["label", "copy", "content"],
};

interface IntentHints {
  helper: boolean;
  form: boolean;
  error: boolean;
  danger: boolean;
  disabled: boolean;
  text: boolean;
}

function detectIntent(queryTerms: string[]): IntentHints {
  const has = (values: string[]) => values.some((value) => queryTerms.includes(value));
  return {
    helper: has(["helper", "hint", "supporting", "description", "caption"]),
    form: has(["form", "input", "field", "validation", "label"]),
    error: has(["error", "invalid", "failed", "validation"]),
    danger: has(["danger", "destructive", "delete", "remove", "risk"]),
    disabled: has(["disabled", "inactive", "readonly"]),
    text: has(["text", "label", "copy", "content", "message"]),
  };
}

function expandQueryTerms(tokens: string[]): string[] {
  const expanded: string[] = [];
  for (const token of tokens) {
    if (!expanded.includes(token)) expanded.push(token);
    const aliases = TERM_ALIASES[token] ?? [];
    for (const alias of aliases) {
      if (!expanded.includes(alias)) expanded.push(alias);
    }
  }
  return expanded;
}

function queryPhrases(tokens: string[]): string[] {
  const phrases: string[] = [];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    phrases.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return phrases;
}

export function tokenizeQuery(query: string): string[] {
  const base = query
    .toLowerCase()
    .split(/[\s/._\-,;:]+/)
    .map((token) => token.replace(/[^a-z0-9]+/g, ""))
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
  return expandQueryTerms(base);
}

function scoreRecord(
  record: RankableTokenRecord,
  queryTerms: string[],
  phrases: string[],
  hints: IntentHints
): { score: number; reasons: Array<{ label: string; points: number }> } {
  if (queryTerms.length === 0) return { score: 0, reasons: [] };
  let score = 0;
  const reasons: Array<{ label: string; points: number }> = [];
  const add = (points: number, label: string): void => {
    score += points;
    reasons.push({ points, label });
  };
  const desc = record.description.toLowerCase();
  const path = record.path.toLowerCase();
  const id = record.id.toLowerCase();
  const category = record.category.toLowerCase();
  const componentTerms = (record.componentTerms ?? []).map((term) => term.toLowerCase());
  const componentPhrases = (record.componentPhrases ?? []).map((term) => term.toLowerCase());
  const searchTerms = record.searchTerms.map((term) => term.toLowerCase());
  const cssVar = record.css?.var ?? "";

  for (const term of queryTerms) {
    if (path.includes(term) || id.includes(term)) add(10, `Path/id matches "${term}"`);
    if (category === term) add(8, `Category equals "${term}"`);
    if (category.includes(term)) add(4, `Category includes "${term}"`);
    if (componentTerms.some((item) => item.includes(term))) add(15, `Component usage matches "${term}"`);
    if (searchTerms.some((item) => item.includes(term))) add(5, `Search term matches "${term}"`);
    if (desc.includes(term)) add(2, `Description contains "${term}"`);
    if (cssVar && cssVar.includes(term)) add(6, `CSS variable contains "${term}"`);
  }

  for (const phrase of phrases) {
    if (desc.includes(phrase)) add(16, `Description phrase "${phrase}"`);
    if (componentPhrases.some((item) => item.includes(phrase))) add(24, `Component phrase "${phrase}"`);
  }

  if (hints.helper && path === "text/secondary") add(30, "Helper-text intent boost");
  if (hints.helper && path === "utility/description") add(30, "Helper-text typography boost");
  if (hints.helper && path === "text/primary") add(-20, "Helper-text penalty for primary text");
  if (hints.helper && path === "text/placeholder") add(-18, "Helper-text penalty for placeholder");
  if (hints.form && hints.helper && path === "text/error") add(18, "Helper + form error override boost");
  if (hints.form && hints.helper && path === "text/danger" && !hints.danger) {
    add(-24, "Penalty: danger less relevant than error in form helper context");
  }

  if (hints.disabled) {
    const hasDisabledSemantics =
      path.includes("disabled") ||
      path.includes("read only") ||
      componentTerms.some((item) => item.includes("disabled") || item.includes("inactive") || item.includes("readonly"));
    if (hasDisabledSemantics) {
      add(28, "Disabled-intent semantic boost");
    } else if (path.startsWith("text/") || path.startsWith("background/") || path.startsWith("border/")) {
      add(-22, "Disabled-intent penalty for non-disabled semantic");
    }
  }

  if (hints.text && record.kind === "color" && !path.startsWith("text/")) {
    add(-8, "Text-intent penalty for non-text color token");
  }

  if (hints.error && path === "text/error") add(20, "Error-intent boost");
  if (hints.error && path === "text/danger" && !hints.danger) add(-12, "Error-intent penalty for danger");
  if (hints.danger && path === "text/danger") add(20, "Danger-intent boost");

  return { score, reasons };
}

export function rankTokens<TRecord extends RankableTokenRecord>(
  records: TRecord[],
  query: string,
  options?: RankOptions
): RankedToken<TRecord>[] {
  const queryTerms = tokenizeQuery(query);
  if (queryTerms.length === 0) return [];

  const kind = options?.kind;
  const limit = options?.limit ?? 12;
  const recommendOnly = options?.recommendOnly ?? false;
  const confidenceRatio = options?.confidenceRatio ?? 0.38;

  const phrases = queryPhrases(queryTerms);
  const hints = detectIntent(queryTerms);

  const scored = records
    .filter((record) => !kind || record.kind === kind)
    .filter((record) => !recommendOnly || record.recommend)
    .map((record) => {
      const { score, reasons } = scoreRecord(record, queryTerms, phrases, hints);
      return { record, score, reasons };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  const topScore = scored[0].score;
  const floor = Math.max(10, Math.floor(topScore * confidenceRatio));
  return scored
    .filter(({ score }) => score >= floor)
    .slice(0, limit)
    .map(({ record, score, reasons }) => ({
      record,
      score,
      reasons: reasons
        .slice()
        .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
        .slice(0, 8),
    }));
}

