"use client";

import { useState } from "react";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(
        data.error === "not_configured"
          ? "ADMIN_PASSWORD غير مضبوط في الخادم."
          : "كلمة السر غير صحيحة.",
      );
    } catch {
      setError("تعذّر الاتصال. أعد المحاولة.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20 }}>
      <form
        onSubmit={submit}
        className="card-solid"
        style={{ width: "min(400px, 100%)", borderRadius: 24, padding: 32, display: "grid", gap: 18 }}
      >
        <div style={{ textAlign: "center", display: "grid", gap: 8, justifyItems: "center" }}>
          <LockIcon />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>لوحة التحكم</h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>
            الدخول مخصّص للمشرف فقط
          </p>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="pw" style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
            كلمة السر
          </label>
          <input
            id="pw"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              background: "var(--surface-solid)",
              border: `1px solid ${error ? "var(--color-red-accent)" : "var(--border)"}`,
              borderRadius: 12,
              padding: "13px 15px",
              color: "var(--text)",
              fontSize: 16,
              minHeight: 48,
            }}
          />
          {error && (
            <span role="alert" style={{ color: "#f19a92", fontSize: 13 }}>
              {error}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !password}
          style={{
            cursor: loading ? "default" : "pointer",
            background: "var(--gold)",
            color: "#04180e",
            border: "none",
            borderRadius: 12,
            padding: "13px",
            fontWeight: 700,
            fontSize: 15,
            minHeight: 48,
            opacity: loading || !password ? 0.6 : 1,
          }}
        >
          {loading ? "..." : "دخول"}
        </button>
      </form>
    </main>
  );
}

function LockIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="var(--gold)" strokeWidth="1.6" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
