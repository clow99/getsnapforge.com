import { Suspense } from "react";
import Image from "next/image";
import { Badge, Card, CardHeader, CardBody, Divider, Title } from "../components/ui-client";
import { LiveSnapshot } from "../components/LiveSnapshot";
import { BrowserMockup } from "../components/BrowserMockup";

export const dynamic = "force-dynamic";

const DEMO_URLS = [
  { title: "Vercel", url: "https://vercel.com" },
  { title: "Velocity UI", url: "https://www.velocityui.com" },
  { title: "Mozilla", url: "https://www.mozilla.org/en-US/" },
];

const FEATURES = [
  {
    title: "Self-hosted",
    desc: "Run the capture service on your own infra. Your screenshots never leave your servers.",
  },
  {
    title: "Disk-cached",
    desc: "First capture stored on disk. Repeat requests within the TTL window skip the headless browser entirely.",
  },
  {
    title: "TypeScript-first",
    desc: "Fully typed SnapshotResult keeps your image handlers compile-safe from request to render.",
  },
  {
    title: "Full-page capture",
    desc: "Configure viewport width, height, and fullPage mode per request or set sensible project defaults.",
  },
  {
    title: "TTL control",
    desc: "Set a default cache duration on the client and override it per-request for fine-grained refresh control.",
  },
  {
    title: "Zero runtime deps",
    desc: "The SDK ships with no runtime dependencies — just the native fetch API and Node's Buffer.",
  },
];

const OUTPUT_FIELDS = [
  {
    field: "dataUrl",
    type: "string",
    example: '"data:image/png;base64,..."',
    desc: "Base64-encoded screenshot ready to embed in an img src.",
  },
  {
    field: "cached",
    type: "boolean",
    example: "true",
    desc: "Whether the response was served from disk cache.",
  },
  {
    field: "capturedAt",
    type: "string",
    example: '"2024-01-15T10:30:00Z"',
    desc: "ISO timestamp of when the screenshot was taken.",
  },
  {
    field: "expiresAt",
    type: "string",
    example: '"2024-01-15T10:35:00Z"',
    desc: "ISO timestamp of when the cache entry expires.",
  },
  {
    field: "ttlSeconds",
    type: "number",
    example: "300",
    desc: "Cache duration in seconds that was applied.",
  },
  {
    field: "mimeType",
    type: "string",
    example: '"image/png"',
    desc: "MIME type of the returned image.",
  },
  {
    field: "sourceUrl",
    type: "string",
    example: '"https://example.com"',
    desc: "The original URL that was captured.",
  },
  {
    field: "bytes",
    type: "Uint8Array",
    example: "Uint8Array(89203)",
    desc: "Raw image bytes for custom processing or storage.",
  },
];

const WITHOUT_CODE = `// Repetitive: manual Puppeteer setup on every call
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: "networkidle2" });
const buf = await page.screenshot({ fullPage: true });
await browser.close();

// No caching — same URL re-launches a full browser
const dataUrl = \`data:image/png;base64,\${buf.toString("base64")}\`;`;

const WITH_CODE = `import { createSnapforgeClient } from "@npmforge/snapforge";

const client = createSnapforgeClient({ baseUrl, apiKey });

const snapshot = await client.getSnapshot({
  url: "https://example.com",
  fullPage: true,
  width: 1440,
});

// snapshot.dataUrl ready to embed in <img src>
// snapshot.cached tells you if it was served from disk
if (snapshot.cached) scheduleRefresh(snapshot.expiresAt);`;

const COMPAT_ITEMS = [
  "Next.js RSC",
  "Express",
  "Hono",
  "Node.js fetch",
  "React Server Components",
  "Edge runtime",
];

function BrowserMockupSkeleton({ hostname }: { hostname: string }) {
  return (
    <div className="bm bm--skeleton">
      <div className="bm__bar">
        <div className="bm__dots">
          <span className="bm__dot bm__dot--red" />
          <span className="bm__dot bm__dot--yellow" />
          <span className="bm__dot bm__dot--green" />
        </div>
        <div className="bm__address">{hostname}</div>
      </div>
      <div className="bm__skeleton" />
    </div>
  );
}

function LiveSnapshotSkeleton({ title }: { title: string }) {
  return (
    <Card variant="shadow" size="md">
      <CardHeader>
        <div className="snapshot-card__header">
          <Title level="h3" size="sm" weight="semibold">
            {title}
          </Title>
          <Badge variant="default" size="sm" dot>
            Loading…
          </Badge>
        </div>
        <p className="snapshot-card__meta">Fetching snapshot…</p>
      </CardHeader>
      <CardBody>
        <div className="snapshot-card__skeleton" />
      </CardBody>
    </Card>
  );
}

export default function HomePage() {
  return (
    <main className="lp-root">
      <nav className="lp-nav">
        <div className="lp-nav__brand">
          <Image
            src="/logo.png"
            alt="Snapforge"
            width={48}
            height={48}
            priority
            style={{ width: 48, height: 48, objectFit: "contain" }}
          />
          <Badge variant="primary" size="sm">v0.1.x</Badge>
        </div>
        <div className="lp-nav__links">
          <a href="#why" className="lp-nav__link">Why</a>
          <a href="#api" className="lp-nav__link">API</a>
          <a href="#playground" className="lp-nav__link">Playground</a>
          <a href="/IMPLEMENT.md" className="lp-nav__link" target="_blank" rel="noopener noreferrer">
            Implement
          </a>
        </div>
        <div className="lp-nav__actions">
          <code className="lp-install-pill">npm i @npmforge/snapforge</code>
          <a
            href="https://github.com/npmforge/snapforge"
            className="lp-nav__link lp-nav__link--dim"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </nav>

      <section className="lp-hero" id="why">
        <div className="lp-hero__badge-row">
          <Badge variant="primary" size="sm">
            TypeScript · Zero deps · Self-hosted
          </Badge>
        </div>
        <h1 className="lp-hero__h1">
          Website Screenshots,<br />On Demand
        </h1>
        <p className="lp-hero__sub">
          One function call captures any URL with a headless browser, caches it
          on disk, and returns a base64 data URL — so your app never re-launches
          a browser for the same page twice.
        </p>
        <div className="lp-hero__ctas">
          <code className="lp-hero__install">npm i @npmforge/snapforge</code>
          <a href="#playground" className="lp-btn lp-btn--outline">
            See live demo
          </a>
        </div>
      </section>

      <section className="lp-hero-visual">
        {["vercel.com", "www.velocityui.com", "www.mozilla.org/en-US/"].map(
          (host) => (
            <Suspense key={host} fallback={<BrowserMockupSkeleton hostname={host} />}>
              <BrowserMockup
                url={`https://${host}`}
                ttlOverrideSeconds={300}
              />
            </Suspense>
          )
        )}
      </section>

      <Divider />

      <section className="lp-features">
        {FEATURES.map((f) => (
          <div key={f.title} className="lp-feature-card">
            <h3 className="lp-feature-card__title">{f.title}</h3>
            <p className="lp-feature-card__desc">{f.desc}</p>
          </div>
        ))}
      </section>

      <Divider />

      <section className="lp-compare">
        <h2 className="lp-section-title">The Problem</h2>
        <p className="lp-section-sub">
          Headless browsers are expensive to spin up. Without a capture service,
          every screenshot request cold-starts Puppeteer, burns memory, and
          produces no cache.
        </p>
        <div className="lp-compare__grid">
          <div className="lp-compare__col">
            <div className="lp-code-header lp-code-header--bad">
              Without Snapforge
            </div>
            <pre className="lp-code lp-code--bad">
              <code>{WITHOUT_CODE}</code>
            </pre>
          </div>
          <div className="lp-compare__col">
            <div className="lp-code-header lp-code-header--good">
              With Snapforge
            </div>
            <pre className="lp-code lp-code--good">
              <code>{WITH_CODE}</code>
            </pre>
          </div>
        </div>
      </section>

      <Divider />

      <section className="lp-schema" id="api">
        <h2 className="lp-section-title">Consistent output, every time</h2>
        <p className="lp-section-sub">
          Every <code className="lp-inline-code">getSnapshot()</code> call
          returns the same typed object — whether the image was freshly captured
          or served from cache.
        </p>
        <div className="lp-table-wrap">
          <table className="lp-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Type</th>
                <th>Example</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {OUTPUT_FIELDS.map((row) => (
                <tr key={row.field}>
                  <td>
                    <code className="lp-inline-code">{row.field}</code>
                  </td>
                  <td>
                    <span className="lp-type">{row.type}</span>
                  </td>
                  <td>
                    <code className="lp-inline-code lp-inline-code--dim">
                      {row.example}
                    </code>
                  </td>
                  <td>{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="lp-schema__note">Works out of the box with</p>
        <div className="lp-compat-pills">
          {COMPAT_ITEMS.map((item) => (
            <span key={item} className="lp-compat-pill">
              {item}
            </span>
          ))}
        </div>
      </section>

      <Divider />

      <section className="lp-playground" id="playground">
        <h2 className="lp-section-title">Live Playground</h2>
        <p className="lp-section-sub">
          Each card below is a real{" "}
          <code className="lp-inline-code">getSnapshot()</code> call rendered
          server-side. Badges show whether the image was served from cache or
          freshly captured.
        </p>
        <div className="snapshot-grid">
          {DEMO_URLS.map((site) => (
            <Suspense key={site.url} fallback={<LiveSnapshotSkeleton title={site.title} />}>
              <LiveSnapshot
                title={site.title}
                targetUrl={site.url}
                ttlOverrideSeconds={120}
              />
            </Suspense>
          ))}
        </div>
      </section>

      <Divider />

      <section className="lp-getstarted">
        <h2 className="lp-getstarted__title">Get started in seconds</h2>
        <p className="lp-getstarted__sub">
          Deploy the capture service and call{" "}
          <code className="lp-inline-code">getSnapshot()</code> from any Node
          environment.
        </p>
        <code className="lp-hero__install">npm i @npmforge/snapforge</code>
        <div className="lp-getstarted__links">
          <a
            href="https://github.com/npmforge/snapforge"
            className="lp-btn lp-btn--outline"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </a>
          <a
            href="/IMPLEMENT.md"
            className="lp-btn lp-btn--outline"
            target="_blank"
            rel="noopener noreferrer"
          >
            AI Implementation Guide
          </a>
        </div>
      </section>

      <footer className="lp-footer">
        <Image
          src="/logo.png"
          alt="Snapforge"
          width={96}
          height={24}
          style={{ height: "auto", opacity: 0.5 }}
        />
        <span className="lp-footer__sep">·</span>
        <a
          href="https://github.com/npmforge/snapforge"
          className="lp-footer__link"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <span className="lp-footer__sep">·</span>
        <span className="lp-footer__copy">MIT License</span>
      </footer>
    </main>
  );
}
