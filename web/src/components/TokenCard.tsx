import { useEffect, useId, useRef, useState } from "react";
import { TokenRecord } from "../types";
import { colorCssVar } from "../search";
import { usePreviewMode } from "../PreviewModeContext";
import "./TokenCard.css";

interface TokenCardProps {
  record: TokenRecord;
  score?: number;
  maxScore?: number;
  reasons?: Array<{ label: string; points: number }>;
  compact?: boolean;
}

/** Convert a raw score into 1–5 relevance dots. */
function relevanceDots(score: number, maxScore?: number): number {
  if (!maxScore || maxScore <= 0) {
    if (score >= 20) return 5;
    if (score >= 14) return 4;
    if (score >= 8) return 3;
    if (score >= 4) return 2;
    return 1;
  }
  const ratio = score / maxScore;
  if (ratio >= 0.9) return 5;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.55) return 3;
  if (ratio >= 0.35) return 2;
  return 1;
}

function RelevanceIndicator({ score, maxScore }: { score: number; maxScore?: number }) {
  const dots = relevanceDots(score, maxScore);
  return (
    <span className="relevance" aria-label={`Relevance: ${dots} of 5`} title={`Relevance score: ${score}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`relevance-dot ${i < dots ? "relevance-dot--on" : ""}`} />
      ))}
    </span>
  );
}

export default function TokenCard({ record, score, maxScore, reasons, compact = false }: TokenCardProps) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  if (record.kind === "color") {
    return <ColorTokenCard record={record} score={score} maxScore={maxScore} reasons={reasons} compact={compact} copied={copied} onCopy={copyToClipboard} />;
  }
  return <TypographyTokenCard record={record} score={score} maxScore={maxScore} reasons={reasons} compact={compact} copied={copied} onCopy={copyToClipboard} />;
}

/* ── Token chain ───────────────────────────────────────────── */

function TokenChain({
  path,
  alias,
  hex,
  mode,
}: {
  path: string;
  alias: string;
  hex: string;
  mode: "light" | "dark";
}) {
  const cleanAlias = alias.replace(/\s*\(.*?\)\s*/g, "").trim();
  const modeLabel = mode === "light" ? "Light" : "Dark";

  return (
    <div className="token-chain">
      <span className="chain-mode-badge chain-mode-badge--{mode}"
        style={{
          background: mode === "light" ? "#f0f4f2" : "#1c2d38",
          color: mode === "light" ? "#3d4f58" : "#c1c7c6",
        }}
      >
        {modeLabel}
      </span>
      <span className="chain-segment chain-segment--semantic">{path}</span>
      <span className="chain-arrow">→</span>
      <span className="chain-segment chain-segment--alias">{cleanAlias}</span>
      <span className="chain-arrow">→</span>
      <span className="chain-segment chain-segment--hex">
        <span
          className="chain-hex-dot"
          style={{ backgroundColor: hex }}
        />
        {hex}
      </span>
    </div>
  );
}

/* ── Color Token Card ──────────────────────────────────────── */

function ColorTokenCard({
  record,
  score,
  maxScore,
  reasons,
  compact,
  copied,
  onCopy,
}: {
  record: TokenRecord;
  score?: number;
  maxScore?: number;
  reasons?: Array<{ label: string; points: number }>;
  compact: boolean;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const previewMode = usePreviewMode();
  const light = record.modeValues?.light;
  const dark = record.modeValues?.dark;
  const activeValue = previewMode === "light" ? light : dark;
  const inactiveValue = previewMode === "light" ? dark : light;
  const lightVar = colorCssVar(record.path, "light");
  const darkVar = colorCssVar(record.path, "dark");
  const activeVar = previewMode === "light" ? lightVar : darkVar;

  return (
    <div
      className={`token-card token-card--color ${compact ? "token-card--compact" : ""} ${!record.recommend ? "token-card--not-recommended" : ""}`}
      data-preview={previewMode}
    >
      <div className="token-card-header">
        <div className="token-card-meta">
          <span className="token-category-badge">{record.category}</span>
          {!record.recommend && <span className="token-badge token-badge--warning">Not recommended</span>}
          {score !== undefined && score > 0 && (
            <RelevanceIndicator score={score} maxScore={maxScore} />
          )}
          {reasons && reasons.length > 0 && (
            <WhyBadge reasons={reasons} />
          )}
        </div>
        <h3 className="token-path">{record.path}</h3>
      </div>

      <p className="token-description">{record.description}</p>

      {/* ── Active mode swatch (large) ── */}
      {activeValue && (
        <div className="swatch-primary-wrap" style={{
          background: previewMode === "dark" ? "#112733" : "#f9fbfa",
        }}>
          <div
            className="swatch-primary"
            style={{ backgroundColor: activeValue.value }}
          />
          <div className="swatch-primary-info">
            <span className="swatch-value swatch-value--large">{activeValue.value}</span>
            <span className="swatch-alias">{formatAlias(activeValue.alias)}</span>
          </div>
          {inactiveValue && (
            <div className="swatch-secondary-wrap" title={`${previewMode === "light" ? "Dark" : "Light"}: ${inactiveValue.value}`}>
              <div
                className="swatch-secondary"
                style={{ backgroundColor: inactiveValue.value }}
              />
              <span className="swatch-secondary-label">
                {previewMode === "light" ? "☾" : "☀"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Token chains ── */}
      <div className="token-chains">
        {light && (
          <TokenChain
            path={record.path}
            alias={light.alias}
            hex={light.value}
            mode="light"
          />
        )}
        {dark && (
          <TokenChain
            path={record.path}
            alias={dark.alias}
            hex={dark.value}
            mode="dark"
          />
        )}
      </div>

      <div className="token-card-footer">
        <div className="token-css-vars">
          <button
            className={`copy-btn copy-btn--primary ${copied === "active" ? "copy-btn--copied" : ""}`}
            onClick={() => onCopy(activeVar, "active")}
            title={`Copy ${previewMode} mode CSS var`}
          >
            <code>{activeVar}</code>
            <span className="copy-btn-label">{copied === "active" ? "Copied!" : "Copy"}</span>
          </button>
          {!compact && (
            <button
              className={`copy-btn copy-btn--secondary ${copied === "other" ? "copy-btn--copied" : ""}`}
              onClick={() => onCopy(previewMode === "light" ? darkVar : lightVar, "other")}
            >
              <code>{previewMode === "light" ? darkVar : lightVar}</code>
              <span className="copy-btn-label">{copied === "other" ? "Copied!" : previewMode === "light" ? "☾ dark" : "☀ light"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Typography Token Card ─────────────────────────────────── */

function TypographyTokenCard({
  record,
  score,
  maxScore,
  reasons,
  compact,
  copied,
  onCopy,
}: {
  record: TokenRecord;
  score?: number;
  maxScore?: number;
  reasons?: Array<{ label: string; points: number }>;
  compact: boolean;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const previewMode = usePreviewMode();
  const cssVar = record.css?.var;
  const futureVar = record.css?.futureVar;
  const props = record.properties;
  const displayName = record.name ?? record.path;

  const sampleStyle = props
    ? {
        fontFamily: props.fontFamily,
        fontWeight: props.fontWeight,
        fontSize: props.fontSize,
        lineHeight: props.lineHeight,
        letterSpacing: props.letterSpacing,
        color: previewMode === "dark" ? "#e8edeb" : "#001e2b",
      }
    : {};

  const sampleBg = previewMode === "dark" ? "#001e2b" : "#f9fbfa";

  return (
    <div
      className={`token-card token-card--typography ${compact ? "token-card--compact" : ""}`}
      data-preview={previewMode}
    >
      <div className="token-card-header">
        <div className="token-card-meta">
          <span className="token-category-badge token-category-badge--typography">typography</span>
          {score !== undefined && score > 0 && (
            <RelevanceIndicator score={score} maxScore={maxScore} />
          )}
          {reasons && reasons.length > 0 && (
            <WhyBadge reasons={reasons} />
          )}
        </div>
        <h3 className="token-path">{displayName}</h3>
      </div>

      <p className="token-description">{record.description}</p>

      {props && (
        <div className="typography-sample" style={{ ...sampleStyle, background: sampleBg }}>
          The quick brown fox jumps over the lazy dog
        </div>
      )}

      {props && (
        <div className="typography-props">
          <PropPill label="Size" value={props.fontSize} />
          <PropPill label="Weight" value={String(props.fontWeight)} />
          <PropPill label="Line" value={props.lineHeight} />
          {props.letterSpacing !== "0%" && <PropPill label="Tracking" value={props.letterSpacing} />}
        </div>
      )}

      <div className="token-card-footer">
        <div className="token-css-vars">
          {cssVar && (
            <button
              className={`copy-btn ${copied === "css" ? "copy-btn--copied" : ""}`}
              onClick={() => onCopy(cssVar, "css")}
            >
              <code>{cssVar}</code>
              <span className="copy-btn-label">{copied === "css" ? "Copied!" : "Copy"}</span>
            </button>
          )}
          {futureVar && futureVar !== cssVar && (
            <button
              className={`copy-btn copy-btn--secondary ${copied === "future" ? "copy-btn--copied" : ""}`}
              onClick={() => onCopy(futureVar, "future")}
            >
              <code>{futureVar}</code>
              <span className="copy-btn-label">{copied === "future" ? "Copied!" : "Future var"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PropPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="prop-pill">
      <span className="prop-pill-label">{label}</span>
      <span className="prop-pill-value">{value}</span>
    </span>
  );
}

function formatAlias(alias: string): string {
  return alias.replace(/\s*\(.*?\)\s*/g, "").trim();
}

function summarizeReasons(
  reasons: Array<{ label: string; points: number }>
): string {
  const hasIntentBoost = reasons.some(
    (r) => r.points >= 18 && (r.label.includes("intent") || r.label.includes("boost"))
  );
  const hasComponentPhrase = reasons.some(
    (r) => r.points >= 24 && r.label.startsWith("Component phrase")
  );
  const hasComponentUsage = reasons.some(
    (r) => r.points === 15 && r.label.startsWith("Component usage")
  );
  const hasPathMatch = reasons.some(
    (r) => r.points === 10 && r.label.startsWith("Path/id")
  );
  const hasPenalties = reasons.some((r) => r.points < 0);
  const totalPositive = reasons.filter((r) => r.points > 0).reduce((s, r) => s + r.points, 0);

  if (hasIntentBoost && hasComponentPhrase) {
    return "Strong match — query intent and a component usage phrase both point to this token.";
  }
  if (hasIntentBoost && hasComponentUsage) {
    return "Strong match — query intent aligns with how this token is used in real components.";
  }
  if (hasIntentBoost) {
    return "Matched on query intent — this token is the semantic fit for that UI pattern.";
  }
  if (hasComponentPhrase && hasPathMatch) {
    return "Matched on token path and a component usage phrase from the query.";
  }
  if (hasComponentPhrase) {
    return "Matched on a component usage phrase — this token is used in that context.";
  }
  if (hasComponentUsage && hasPathMatch) {
    return "Matched on token path and component usage terms from the query.";
  }
  if (hasComponentUsage) {
    return "Matched via component usage — this token appears in that UI element.";
  }
  if (hasPathMatch && hasPenalties) {
    return "Partial match — token path matched but some signals reduced confidence.";
  }
  if (hasPathMatch) {
    return "Matched on token path name.";
  }
  if (totalPositive > 0) {
    return "Low-confidence match — some query keywords appear in the description or search terms.";
  }
  return "Weak match — only loose keyword overlap found.";
}

function WhyBadge({ reasons }: { reasons: Array<{ label: string; points: number }> }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  const summary = summarizeReasons(reasons);
  const positives = [...reasons]
    .filter((r) => r.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);
  const negatives = [...reasons]
    .filter((r) => r.points < 0)
    .sort((a, b) => a.points - b.points)
    .slice(0, 3);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointerDown(e: PointerEvent) {
      if (buttonRef.current?.contains(e.target as Node)) return;
      const panel = document.getElementById(popoverId);
      if (!panel?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, popoverId]);

  return (
    <span className="why-badge-wrap">
      <button
        ref={buttonRef}
        type="button"
        className={`why-badge${open ? " why-badge--open" : ""}`}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((o) => !o)}
      >
        Why?
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Why this result"
          className="why-popover"
        >
          <p className="why-popover-heading">Why this result?</p>
          <p className="why-popover-summary">{summary}</p>

          {positives.length > 0 && (
            <ul className="why-popover-list">
              {positives.map((r, i) => (
                <li key={i} className="why-popover-item why-popover-item--positive">
                  <span className="why-popover-points">+{r.points}</span>
                  <span className="why-popover-label">{r.label}</span>
                </li>
              ))}
            </ul>
          )}

          {negatives.length > 0 && (
            <>
              <p className="why-popover-subheading">Penalized</p>
              <ul className="why-popover-list">
                {negatives.map((r, i) => (
                  <li key={i} className="why-popover-item why-popover-item--negative">
                    <span className="why-popover-points">{r.points}</span>
                    <span className="why-popover-label">{r.label}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {positives.length === 0 && negatives.length === 0 && (
            <p className="why-popover-empty">Low-confidence lexical match.</p>
          )}
        </div>
      )}
    </span>
  );
}
