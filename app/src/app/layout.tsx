import "./globals.css";
import { DEMO_MODE, TESTNET } from "@/lib/stellar";

export const metadata = { title: "RemitHome — the $200 that actually pays the rent" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{ padding: "12px 20px", borderBottom: "1px solid #ddd", display: "flex", justifyContent: "space-between" }}>
          <strong>RemitHome</strong>
          <span style={{ fontSize: 13 }}>
            Mode: <strong>{DEMO_MODE}</strong>
            {TESTNET.contractId ? ` · Contract: ${TESTNET.contractId.slice(0, 8)}…` : " · Contract: not deployed yet"}
          </span>
        </header>
        <nav style={{ padding: "8px 20px", display: "flex", gap: 16 }}>
          <a href="/">Send</a>
          <a href="/track">Track</a>
          <a href="/agent">Agent pickup</a>
        </nav>
        <main style={{ padding: "20px", maxWidth: 720 }}>{children}</main>
        <footer style={{ padding: "12px 20px", fontSize: 12, color: "#666" }}>
          Hackathon prototype — Stellar Testnet only, no real funds. Demo FX 1 USD = 1,550 NGN
          (fixed, not a live rate). MoneyGram cash-out in production via SEP-24; demo uses a
          simulated agent, labelled on the agent page.
        </footer>
      </body>
    </html>
  );
}
