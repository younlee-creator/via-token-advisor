import { useState } from "react";

const HASH = "155c49293661b0e3e8b60ffa93097aaad0e391eea945b32ae08582b91b3013c1";
const SESSION_KEY = "via_unlocked";

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1"
  );
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  if (unlocked) return <>{children}</>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    const hash = await sha256(value.trim());
    if (hash === HASH) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true);
      setValue("");
    }
    setChecking(false);
  }

  return (
    <div className="gate-wrap">
      <div className="gate-card">
        <span className="gate-logo">
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 17C3 17 4 10 10 7C16 4 17 3 17 3C17 3 16 9 13 13C10 17 3 17 3 17Z"
              fill="#00A35C"
              stroke="#00684A"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M3 17L9 11" stroke="#00684A" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <h1 className="gate-title">Via Token Advisor</h1>
        <p className="gate-hint">Enter the password to continue</p>
        <form className="gate-form" onSubmit={handleSubmit}>
          <input
            className={`gate-input ${error ? "gate-input--error" : ""}`}
            type="password"
            placeholder="Password"
            value={value}
            autoFocus
            autoComplete="current-password"
            onChange={(e) => { setValue(e.target.value); setError(false); }}
          />
          {error && <p className="gate-error">Incorrect password</p>}
          <button className="gate-btn" type="submit" disabled={checking || !value}>
            {checking ? "Checking…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
