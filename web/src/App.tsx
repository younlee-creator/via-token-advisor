import { useState, useEffect, useRef } from "react";
import advisorData from "../../data/generated/advisor-tokens.json";
import { AdvisorIndex, AppMode } from "./types";
import { PreviewMode, PreviewModeContext } from "./PreviewModeContext";
import IntentSearch from "./components/IntentSearch";
import BrowseView from "./components/BrowseView";
import CodeAuditor from "./components/CodeAuditor";
import "./App.css";

const data = advisorData as unknown as AdvisorIndex;

export default function App() {
  const [mode, setMode] = useState<AppMode>("search");
  const [searchKey, setSearchKey] = useState(0);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function togglePreview() {
    setPreviewMode((m) => (m === "light" ? "dark" : "light"));
  }

  function navigate(next: AppMode) {
    setMode(next);
    setMenuOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <PreviewModeContext.Provider value={previewMode}>
      <div className="app">
        <header className="app-header">
          <div className="header-inner">
            <button
              className="header-brand"
              type="button"
              aria-label="Via Token Advisor — go to home"
              onClick={() => { navigate("search"); setSearchKey((k) => k + 1); }}
            >
              <span className="header-logo">
                <LeafIcon />
              </span>
              <div>
                <span className="header-title">Via Token Advisor</span>
                <span className="header-subtitle">
                  {data.counts.colors} color tokens · {data.counts.typography} typography styles
                </span>
              </div>
            </button>

            {/* Desktop nav */}
            <nav className="header-nav" role="tablist">
              <NavTab active={mode === "search"} onClick={() => navigate("search")} label="Search" icon="🔍" />
              <NavTab active={mode === "browse"} onClick={() => navigate("browse")} label="Browse" icon="◻" />
              <NavTab active={mode === "audit"} onClick={() => navigate("audit")} label="Code Audit" icon="⚡" />
            </nav>

            {/* Mobile hamburger */}
            <div className="hamburger-wrap" ref={menuRef}>
              <button
                className={`hamburger-btn ${menuOpen ? "hamburger-btn--open" : ""}`}
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Open navigation menu"
                aria-expanded={menuOpen}
              >
                <span /><span /><span />
              </button>

              {menuOpen && (
                <div className="mobile-menu" role="menu">
                  {(["search", "browse", "audit"] as AppMode[]).map((m) => (
                    <button
                      key={m}
                      className={`mobile-menu-item ${mode === m ? "mobile-menu-item--active" : ""}`}
                      role="menuitem"
                      onClick={() => navigate(m)}
                    >
                      {m === "search" ? "🔍 Search" : m === "browse" ? "◻ Browse" : "⚡ Code Audit"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="app-main">
          {mode === "search" && (
            <IntentSearch
              key={searchKey}
              records={data.records}
              previewMode={previewMode}
              onTogglePreview={togglePreview}
            />
          )}
          {mode === "browse" && (
            <BrowseView
              records={data.records}
              previewMode={previewMode}
              onTogglePreview={togglePreview}
            />
          )}
          {mode === "audit" && (
            <CodeAuditor
              records={data.records}
              previewMode={previewMode}
              onTogglePreview={togglePreview}
            />
          )}
        </main>
      </div>
    </PreviewModeContext.Provider>
  );
}

function NavTab({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
}) {
  return (
    <button
      className={`nav-tab ${active ? "nav-tab--active" : ""}`}
      onClick={onClick}
      role="tab"
      aria-selected={active}
    >
      <span className="nav-tab-icon">{icon}</span>
      {label}
    </button>
  );
}

function LeafIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M3 17C3 17 4 10 10 7C16 4 17 3 17 3C17 3 16 9 13 13C10 17 3 17 3 17Z"
        fill="#00A35C"
        stroke="#00684A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M3 17L9 11" stroke="#00684A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
