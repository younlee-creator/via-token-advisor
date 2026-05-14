import { PreviewMode } from "../PreviewModeContext";

interface PreviewToggleProps {
  mode: PreviewMode;
  onToggle: () => void;
}

export default function PreviewToggle({ mode, onToggle }: PreviewToggleProps) {
  return (
    <button
      className={`preview-toggle ${mode === "dark" ? "preview-toggle--dark" : ""}`}
      onClick={onToggle}
      title={`Switch to ${mode === "light" ? "dark" : "light"} mode preview`}
      aria-label={`Token preview: ${mode} mode`}
    >
      <span className="preview-toggle-track">
        <span className="preview-toggle-thumb" />
      </span>
      <span className="preview-toggle-label">
        {mode === "light" ? "☀ Light" : "☾ Dark"}
      </span>
    </button>
  );
}
