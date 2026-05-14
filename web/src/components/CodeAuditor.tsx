import { useState } from "react";
import { TokenRecord } from "../types";
import { PreviewMode } from "../PreviewModeContext";
import { auditCode, applyTokenSuggestions, AuditMatch } from "../auditor";
import { colorCssVar } from "../search";
import PreviewToggle from "./PreviewToggle";
import "./CodeAuditor.css";

const DEMO_SNIPPET = `/* Custom timeline component */
.timeline-item {
  background-color: #FFFFFF;
  border: 1px solid #E8EDEB;
  color: #001E2B;
  border-radius: 8px;
  padding: 16px;
  gap: 12px;
}

.timeline-item--error {
  background-color: #FFEAE5;
  border-color: #DB3030;
  color: #970606;
  padding: 16px 24px;
}

.timeline-item--success {
  background-color: #E3FCF7;
  border-color: #00A35C;
  color: #00684A;
  padding: 16px 24px;
}

.timeline-item-label {
  color: #5C6C75;
  font-size: 13px;
  margin-bottom: 8px;
}

.timeline-item--disabled {
  background-color: #E8EDEB;
  color: #C1C7C6;
  padding: 16px;
}

.timeline-connector {
  width: 2px;
  height: 32px;
  background-color: #E8EDEB;
  margin: 0 24px;
}`;

interface CodeAuditorProps {
  records: TokenRecord[];
  previewMode: PreviewMode;
  onTogglePreview: () => void;
}

type View = "tokens" | "diff";

export default function CodeAuditor({ records, previewMode, onTogglePreview }: CodeAuditorProps) {
  const [code, setCode] = useState(DEMO_SNIPPET);
  const [result, setResult] = useState<ReturnType<typeof auditCode> | null>(null);
  const [activeView, setActiveView] = useState<View>("tokens");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeKind, setActiveKind] = useState<"all" | "color" | "spacing">("all");

  function runAudit() {
    setIsAnalyzing(true);
    setTimeout(() => {
      setResult(auditCode(code, records));
      setIsAnalyzing(false);
    }, 120);
  }

  const suggested = result ? applyTokenSuggestions(code, result.matches) : "";

  const visibleMatches = result?.matches.filter((m) => {
    if (activeKind === "color") return m.kind === "color";
    if (activeKind === "spacing") return m.kind === "spacing";
    return true;
  }) ?? [];

  const colorCount = result?.matches.filter((m) => m.kind === "color").length ?? 0;
  const spacingCount = result?.matches.filter((m) => m.kind === "spacing").length ?? 0;
  const matchedColorCount = result?.colorMatches ?? 0;
  const matchedSpacingCount = result?.spacingMatches ?? 0;

  return (
    <div className="code-auditor">
      <div className="auditor-header">
        <div>
          <h1 className="auditor-title">Code Auditor</h1>
          <p className="auditor-subtitle">
            Paste CSS or JSX — detect hardcoded hex colors and spacing values, then map them to Via tokens.
          </p>
        </div>
      </div>

      <div className="auditor-layout">
        {/* ── Left: input ── */}
        <div className="auditor-input-panel">
          <div className="panel-header">
            <span className="panel-title">Your code</span>
            <div className="panel-actions">
              <button className="panel-action" onClick={() => { setCode(""); setResult(null); }}>Clear</button>
              <button className="panel-action" onClick={() => { setCode(DEMO_SNIPPET); setResult(null); }}>Load example</button>
            </div>
          </div>
          <textarea
            className="code-textarea"
            value={code}
            onChange={(e) => { setCode(e.target.value); setResult(null); }}
            spellCheck={false}
            placeholder="Paste CSS or JSX here…"
          />
          <div className="auditor-run">
            <button
              className="run-btn"
              onClick={runAudit}
              disabled={!code.trim() || isAnalyzing}
            >
              {isAnalyzing ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </div>

        {/* ── Right: results ── */}
        <div className="auditor-results-panel">
          {!result ? (
            <div className="auditor-placeholder">
              <div className="placeholder-icon">⚡</div>
              <p>Paste code and click <strong>Analyze</strong> to detect hardcoded hex colors and spacing values — then see which Via tokens they map to.</p>
              <p className="placeholder-hint">Try the example to see it in action.</p>
            </div>
          ) : (
            <>
              {/* ── Summary bar ── */}
              <div className="audit-summary">
                <div className={`summary-stat ${matchedColorCount > 0 ? "summary-stat--matched" : ""}`}>
                  <span className="summary-number">{matchedColorCount}</span>
                  <span className="summary-label">color matches</span>
                </div>
                <div className={`summary-stat ${matchedSpacingCount > 0 ? "summary-stat--spacing" : ""}`}>
                  <span className="summary-number">{matchedSpacingCount}</span>
                  <span className="summary-label">spacing matches</span>
                </div>
                <div className={`summary-stat ${colorCount - matchedColorCount > 0 ? "summary-stat--unmatched" : ""}`}>
                  <span className="summary-number">{colorCount - matchedColorCount}</span>
                  <span className="summary-label">unrecognized</span>
                </div>
                <div className="audit-summary-toggle">
                  <PreviewToggle mode={previewMode} onToggle={onTogglePreview} />
                </div>
              </div>

              {/* ── View + kind tabs ── */}
              <div className="result-controls">
                <div className="result-tabs">
                  <button
                    className={`result-tab ${activeView === "tokens" ? "result-tab--active" : ""}`}
                    onClick={() => setActiveView("tokens")}
                  >
                    Token map
                  </button>
                  <button
                    className={`result-tab ${activeView === "diff" ? "result-tab--active" : ""}`}
                    onClick={() => setActiveView("diff")}
                  >
                    After
                  </button>
                </div>

                {activeView === "tokens" && (
                  <div className="kind-filter-small">
                    {(["all", "color", "spacing"] as const).map((k) => (
                      <button
                        key={k}
                        className={`kind-filter-btn ${activeKind === k ? "kind-filter-btn--active" : ""}`}
                        onClick={() => setActiveKind(k)}
                      >
                        {k === "all" ? `All (${result.matches.length})` : k === "color" ? `Colors (${colorCount})` : `Spacing (${spacingCount})`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Token map ── */}
              {activeView === "tokens" && (
                <div className="token-map">
                  {visibleMatches.length === 0 ? (
                    <div className="no-matches">Nothing detected in this category.</div>
                  ) : (
                    visibleMatches.map((m) => (
                      <AuditMatchRow key={`${m.kind}-${m.normalized}`} match={m} />
                    ))
                  )}
                </div>
              )}

              {/* ── Diff view ── */}
              {activeView === "diff" && (
                <div className="diff-view">
                  <div className="diff-panel diff-panel--before">
                    <div className="diff-label diff-label--before">Before (hardcoded)</div>
                    <pre className="diff-code">{code}</pre>
                  </div>
                  <div className="diff-panel diff-panel--after">
                    <div className="diff-label diff-label--after">After (Via tokens)</div>
                    <pre className="diff-code diff-code--after">{suggested}</pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Audit match row ─────────────────────────────────────────── */

function AuditMatchRow({ match }: { match: AuditMatch }) {
  const [copied, setCopied] = useState(false);
  const best = match.tokens.find((t) => t.recommend) ?? match.tokens[0];
  const hasColorMatch = match.kind === "color" && match.tokens.length > 0;
  const hasSpacingMatch = match.kind === "spacing" && !!match.spacingVar;
  const hasAnyMatch = hasColorMatch || hasSpacingMatch;

  function copyBestVar() {
    let varName: string | null = null;
    if (hasColorMatch && best) {
      varName = colorCssVar(best.path, "light");
    } else if (hasSpacingMatch && match.spacingVar) {
      varName = match.spacingVar;
    }
    if (!varName) return;
    navigator.clipboard.writeText(`var(${varName})`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  if (match.kind === "spacing") {
    return (
      <div className={`match-row ${hasSpacingMatch ? "match-row--spacing" : "match-row--unmatched"}`}>
        <div className="match-swatch-wrap">
          <div className="match-spacing-icon">⟷</div>
          <div className="match-hex-info">
            <span className="match-hex">{match.normalized}</span>
            {match.length > 1 && <span className="match-occurrences">×{match.length}</span>}
          </div>
        </div>

        <span className="match-arrow">{hasSpacingMatch ? "→" : "?"}</span>

        {hasSpacingMatch ? (
          <div className="match-tokens">
            <div className="match-token">
              <span className="match-token-path">{match.spacingVar}</span>
            </div>
            <button
              className={`match-copy-btn ${copied ? "match-copy-btn--copied" : ""}`}
              onClick={copyBestVar}
            >
              {copied ? "Copied!" : `Copy var(${match.spacingVar})`}
            </button>
          </div>
        ) : (
          <div className="match-unrecognized">
            <span>No Via spacing token for {match.normalized}</span>
            <span className="match-hint">Not on the spacing scale</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`match-row ${hasAnyMatch ? "match-row--matched" : "match-row--unmatched"}`}>
      <div className="match-swatch-wrap">
        <div
          className="match-swatch"
          style={{ backgroundColor: match.normalized }}
        />
        <div className="match-hex-info">
          <span className="match-hex">{match.normalized}</span>
          {match.length > 1 && (
            <span className="match-occurrences">×{match.length}</span>
          )}
          {match.mode && (
            <span className={`match-mode match-mode--${match.mode}`}>
              {match.mode === "both" ? "light + dark" : match.mode}
            </span>
          )}
        </div>
      </div>

      <span className="match-arrow">{hasAnyMatch ? "→" : "?"}</span>

      {hasColorMatch ? (
        <div className="match-tokens">
          {match.tokens.slice(0, 3).map((t) => (
            <div key={t.id} className={`match-token ${!t.recommend ? "match-token--deprecated" : ""}`}>
              <span className="match-token-path">{t.path}</span>
              {!t.recommend && <span className="match-token-tag">deprecated</span>}
            </div>
          ))}
          {best && (
            <button
              className={`match-copy-btn ${copied ? "match-copy-btn--copied" : ""}`}
              onClick={copyBestVar}
            >
              {copied ? "Copied!" : `Copy var(${colorCssVar(best.path, "light")})`}
            </button>
          )}
        </div>
      ) : (
        <div className="match-unrecognized">
          <span>No matching Via token</span>
          <span className="match-hint">Primitive or ad-hoc value — check if a semantic token covers this use case</span>
        </div>
      )}
    </div>
  );
}
