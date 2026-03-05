import { LiveSnapshot } from "../components/LiveSnapshot";

export const dynamic = "force-dynamic";

const DEMO_PORTFOLIOS = [
  { title: "Vercel", url: "https://vercel.com" },
  { title: "Cloudflare", url: "https://www.cloudflare.com" },
  { title: "Mozilla", url: "https://www.mozilla.org" }
];

export default function HomePage() {
  return (
    <main>
      <section style={{ display: "grid", gap: "0.85rem", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Snapforge Live Demo</h1>
        <p style={{ color: "#bbc4d2", maxWidth: "72ch", lineHeight: 1.5 }}>
          Each card below requests a screenshot from the self-hosted Snapforge service.
          Screenshots are captured on first request, cached on disk, and refreshed by TTL.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1rem"
        }}
      >
        {DEMO_PORTFOLIOS.map((portfolio) => (
          <LiveSnapshot
            key={portfolio.url}
            title={portfolio.title}
            targetUrl={portfolio.url}
            ttlOverrideSeconds={120}
          />
        ))}
      </section>
    </main>
  );
}
