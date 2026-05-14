import { useMemo, useRef, useState } from "react";
import { TokenRecord, TokenKind } from "../types";
import { PreviewMode } from "../PreviewModeContext";
import { searchTokens } from "../search";
import TokenCard from "./TokenCard";
import PreviewToggle from "./PreviewToggle";
import "./IntentSearch.css";

const EXAMPLE_QUERIES = [
  "disabled button text",
  "error state in a form",
  "keyboard focus ring",
  "popover or dropdown background",
  "heading for a modal",
  "helper text below a form input",
  "success confirmation message",
  "read-only input field",
];

interface IntentSearchProps {
  records: TokenRecord[];
  previewMode: PreviewMode;
  onTogglePreview: () => void;
}

export default function IntentSearch({ records, previewMode, onTogglePreview }: IntentSearchProps) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<TokenKind>("all");
  const [submitted, setSubmitted] = useState("");
  const [recommendOnly, setRecommendOnly] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const submittedQuery = submitted.trim();
  const resultBuckets = useMemo(() => {
    if (!submittedQuery) {
      return {
        recommended: {
          color: [] as Array<{ record: TokenRecord; score: number; reasons: Array<{ label: string; points: number }> }>,
          typography: [] as Array<{ record: TokenRecord; score: number; reasons: Array<{ label: string; points: number }> }>,
          all: [] as Array<{ record: TokenRecord; score: number; reasons: Array<{ label: string; points: number }> }>,
        },
        broad: {
          color: [] as Array<{ record: TokenRecord; score: number; reasons: Array<{ label: string; points: number }> }>,
          typography: [] as Array<{ record: TokenRecord; score: number; reasons: Array<{ label: string; points: number }> }>,
          all: [] as Array<{ record: TokenRecord; score: number; reasons: Array<{ label: string; points: number }> }>,
        },
      };
    }

    function buildBucket(onlyRecommended: boolean) {
      const color = searchTokens(records, submittedQuery, {
        kind: "color",
        recommendOnly: onlyRecommended,
        limit: Number.MAX_SAFE_INTEGER,
      });
      const typography = searchTokens(records, submittedQuery, {
        kind: "typography-style",
        recommendOnly: onlyRecommended,
        limit: Number.MAX_SAFE_INTEGER,
      });
      return {
        color,
        typography,
        all: mergeKindBalanced(color, typography, Number.MAX_SAFE_INTEGER),
      };
    }

    return {
      recommended: buildBucket(true),
      broad: buildBucket(false),
    };
  }, [records, submittedQuery]);
  const activeBucket = recommendOnly ? resultBuckets.recommended : resultBuckets.broad;
  const colorMatches = activeBucket.color;
  const typographyMatches = activeBucket.typography;
  const allMatches = activeBucket.all;
  const scopedResults = kindFilter === "all"
    ? allMatches
    : kindFilter === "color"
      ? colorMatches
      : typographyMatches;
  const results = scopedResults.slice(0, 12);
  const maxScore = results[0]?.score;

  function handleSubmit(q: string) {
    setSubmitted(q);
    setQuery(q);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSubmit(query);
  }

  return (
    <div className="intent-search">
      {/* ── Search bar ── */}
      <div className="search-hero">
        <h1 className="search-hero-title">
          What are you building?
        </h1>
        <p className="search-hero-subtitle">
          Describe a UI element or state in plain English — get the right Via token.
        </p>

        <div className="search-bar">
          <div className="search-input-wrap">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="#889397" strokeWidth="1.5" />
                <path d="M10.5 10.5L13.5 13.5" stroke="#889397" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              ref={inputRef}
              className="search-input"
              type="text"
              placeholder='e.g. "error text in a form field"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {query && (
              <button
                className="search-clear"
                onClick={() => { setQuery(""); setSubmitted(""); inputRef.current?.focus(); }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="search-controls">
            <div className="kind-filter" role="group" aria-label="Filter by type">
              {(["all", "color", "typography-style"] as TokenKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`kind-btn ${kindFilter === k ? "kind-btn--active" : ""}`}
                  onClick={() => setKindFilter(k)}
                >
                  {k === "all"
                    ? `All${submitted ? ` (${allMatches.length})` : ""}`
                    : k === "color"
                      ? `Color${submitted ? ` (${colorMatches.length})` : ""}`
                      : `Typography${submitted ? ` (${typographyMatches.length})` : ""}`}
                </button>
              ))}
            </div>
            <div className="kind-filter" role="group" aria-label="Result mode">
              <span className="tooltip-wrap" data-tooltip="Only actively maintained tokens">
                <button
                  type="button"
                  className={`kind-btn ${recommendOnly ? "kind-btn--active" : ""}`}
                  onClick={() => setRecommendOnly(true)}
                >
                  Recommended
                </button>
              </span>
              <span className="tooltip-wrap" data-tooltip="Include deprecated or not-recommended tokens">
                <button
                  type="button"
                  className={`kind-btn ${!recommendOnly ? "kind-btn--active" : ""}`}
                  onClick={() => setRecommendOnly(false)}
                >
                  Broad
                </button>
              </span>
            </div>

            <button
              className="search-submit"
              onClick={() => handleSubmit(query)}
              disabled={!query.trim()}
            >
              Search
            </button>
          </div>
        </div>

        {/* ── Example queries ── */}
        {!submitted && (
          <div className="search-examples">
            <span className="search-examples-label">Try:</span>
            <div className="search-examples-pills">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  className="example-pill"
                  onClick={() => handleSubmit(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {submitted && (
        <div className="search-results">
          <div className="search-results-header">
            <span className="results-count">
              {results.length === 0
                ? `No tokens matched "${submitted}"`
                : `Showing ${results.length} of ${scopedResults.length} token${scopedResults.length === 1 ? "" : "s"} for "${submitted}"`}
            </span>
            <div className="results-header-actions">
              <PreviewToggle mode={previewMode} onToggle={onTogglePreview} />
              {results.length > 0 && (
                <button className="results-clear" onClick={() => { setSubmitted(""); setQuery(""); }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {results.length === 0 && (
            <div className="empty-state">
              <p>Try broader terms like <em>background</em>, <em>text</em>, <em>error</em>, <em>disabled</em>, or <em>heading</em>.</p>
              <div className="empty-state-pills">
                {["background", "text error", "focus ring", "disabled", "heading"].map((q) => (
                  <button key={q} className="example-pill" onClick={() => handleSubmit(q)}>{q}</button>
                ))}
              </div>
            </div>
          )}

          <div className="results-grid">
            {results.map(({ record, score, reasons }) => (
              <TokenCard key={record.id} record={record} score={score} maxScore={maxScore} reasons={reasons} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function mergeKindBalanced(
  colorMatches: Array<{ record: TokenRecord; score: number; reasons: Array<{ label: string; points: number }> }>,
  typographyMatches: Array<{ record: TokenRecord; score: number; reasons: Array<{ label: string; points: number }> }>,
  limit: number
): Array<{ record: TokenRecord; score: number; reasons: Array<{ label: string; points: number }> }> {
  const merged: Array<{ record: TokenRecord; score: number; reasons: Array<{ label: string; points: number }> }> = [];
  let colorIndex = 0;
  let typographyIndex = 0;

  while (merged.length < limit && (colorIndex < colorMatches.length || typographyIndex < typographyMatches.length)) {
    const nextColor = colorMatches[colorIndex];
    const nextTypography = typographyMatches[typographyIndex];

    if (!nextColor) {
      merged.push(nextTypography);
      typographyIndex += 1;
      continue;
    }
    if (!nextTypography) {
      merged.push(nextColor);
      colorIndex += 1;
      continue;
    }

    const preferColor = merged.length % 3 !== 2;
    if (preferColor) {
      if (nextColor.score >= nextTypography.score) {
        merged.push(nextColor);
        colorIndex += 1;
      } else {
        merged.push(nextTypography);
        typographyIndex += 1;
      }
    } else if (nextTypography.score >= nextColor.score) {
      merged.push(nextTypography);
      typographyIndex += 1;
    } else {
      merged.push(nextColor);
      colorIndex += 1;
    }
  }

  return merged;
}
