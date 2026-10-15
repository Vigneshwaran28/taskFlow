"use client";
// Last resort when the root layout itself fails: no app styles or providers can be relied on, so inline styles only.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ maxWidth: 440, textAlign: "center" }}>
            <p style={{ fontSize: 64, fontWeight: 700, margin: 0, color: "#4f46e5" }}>500</p>
            <h1 style={{ fontSize: 24, margin: "8px 0" }}>TaskFlow couldn&apos;t load</h1>
            <p style={{ color: "#64748b", fontSize: 14 }}>Something went wrong while starting the app. Your data is safe.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
              <button type="button" onClick={reset} style={{ padding: "8px 16px", borderRadius: 8, border: 0, background: "#4f46e5", color: "white", cursor: "pointer" }}>
                Try again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the router may be what failed */}
              <a href="/" style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#0f172a", textDecoration: "none" }}>
                Start page
              </a>
            </div>
            {error.digest && <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 16 }}>Error reference: {error.digest}</p>}
          </div>
        </main>
      </body>
    </html>
  );
}
