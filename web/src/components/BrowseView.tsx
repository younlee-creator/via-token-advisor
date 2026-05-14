import { useState, useMemo } from "react";
import { TokenRecord, TokenKind } from "../types";
import { PreviewMode } from "../PreviewModeContext";
import TokenCard from "./TokenCard";
import PreviewToggle from "./PreviewToggle";
import "./BrowseView.css";

interface BrowseViewProps {
  records: TokenRecord[];
  previewMode: PreviewMode;
  onTogglePreview: () => void;
}

const KIND_LABELS: Record<TokenKind, string> = {
  all: "All",
  color: "Color",
  "typography-style": "Typography",
};

export default function BrowseView({ records, previewMode, onTogglePreview }: BrowseViewProps) {
  const [kindFilter, setKindFilter] = useState<TokenKind>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showNotRecommended, setShowNotRecommended] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const r of records) {
      if (kindFilter === "all" || r.kind === kindFilter) {
        seen.add(r.category);
      }
    }
    return ["all", ...Array.from(seen).sort()];
  }, [records, kindFilter]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return records.filter((r) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (!showNotRecommended && !r.recommend) return false;
      if (q && !r.path.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [records, kindFilter, categoryFilter, showNotRecommended, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, TokenRecord[]>();
    for (const r of filtered) {
      const key = r.category;
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  function handleKindChange(k: TokenKind) {
    setKindFilter(k);
    setCategoryFilter("all");
  }

  return (
    <div className="browse-view">
      {/* ── Filter bar ── */}
      <div className="browse-toolbar">
        <div className="browse-filters">
          <div className="filter-group">
            <span className="filter-label">Type</span>
            <div className="filter-pills" role="group">
              {(["all", "color", "typography-style"] as TokenKind[]).map((k) => (
                <button
                  key={k}
                  className={`filter-pill ${kindFilter === k ? "filter-pill--active" : ""}`}
                  onClick={() => handleKindChange(k)}
                >
                  {KIND_LABELS[k]}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Category</span>
            <div className="filter-pills filter-pills--scroll" role="group">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`filter-pill ${categoryFilter === cat ? "filter-pill--active" : ""}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat === "all" ? "All" : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="browse-search-wrap">
          <input
            className="browse-search"
            type="text"
            placeholder="Filter by name or description…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <label className="not-recommended-toggle">
            <input
              type="checkbox"
              checked={showNotRecommended}
              onChange={(e) => setShowNotRecommended(e.target.checked)}
            />
            <span>Show deprecated</span>
          </label>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="browse-stats">
        <span className="browse-stats-count">
          {filtered.length} token{filtered.length === 1 ? "" : "s"}
        </span>
        {searchQuery && (
          <button className="browse-clear" onClick={() => setSearchQuery("")}>
            Clear filter
          </button>
        )}
        <div className="browse-stats-toggle">
          <PreviewToggle mode={previewMode} onToggle={onTogglePreview} />
        </div>
      </div>

      {/* ── Token groups ── */}
      {grouped.length === 0 ? (
        <div className="browse-empty">No tokens match the current filters.</div>
      ) : (
        <div className="browse-groups">
          {grouped.map(([category, tokens]) => (
            <section key={category} className="browse-group">
              <div className="browse-group-header">
                <h2 className="browse-group-title">{category}</h2>
                <span className="browse-group-count">{tokens.length}</span>
              </div>
              <div className="browse-grid">
                {tokens.map((r) => (
                  <TokenCard key={r.id} record={r} compact />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
