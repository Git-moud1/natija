import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div style={{ display: "grid", gap: 16, justifyItems: "center" }}>
        <div className="tnum" style={{ fontSize: 64, fontWeight: 800, color: "var(--gold)" }}>
          ٤٠٤
        </div>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 16 }}>
          الصفحة غير موجودة · Page introuvable
        </p>
        <Link
          href="/"
          style={{
            background: "var(--gold)",
            color: "#04180e",
            textDecoration: "none",
            borderRadius: 999,
            padding: "11px 26px",
            fontWeight: 700,
            minHeight: 44,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          الرئيسية · Accueil
        </Link>
      </div>
    </main>
  );
}
