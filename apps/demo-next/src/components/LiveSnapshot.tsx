import { createSnapforgeClient } from "snapforge";

interface LiveSnapshotProps {
  targetUrl: string;
  title: string;
  ttlOverrideSeconds?: number;
}

function getClient() {
  const baseUrl = process.env.SNAPFORGE_SERVICE_URL;
  const apiKey = process.env.SNAPFORGE_API_KEY;

  if (!baseUrl || !apiKey) {
    return null;
  }

  return createSnapforgeClient({
    baseUrl,
    apiKey
  });
}

export async function LiveSnapshot({
  targetUrl,
  title,
  ttlOverrideSeconds
}: LiveSnapshotProps) {
  const client = getClient();
  if (!client) {
    return (
      <article
        style={{
          display: "grid",
          gap: "0.75rem",
          border: "1px solid #232a35",
          borderRadius: "0.75rem",
          padding: "0.9rem",
          background: "#11151c"
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>{title}</h2>
        <p style={{ fontSize: "0.825rem", color: "#9da8b7" }}>
          Configure SNAPFORGE_SERVICE_URL and SNAPFORGE_API_KEY to render live snapshots.
        </p>
      </article>
    );
  }

  let snapshot;
  try {
    snapshot = await client.getSnapshot({
      url: targetUrl,
      ttlOverrideSeconds,
      fullPage: true,
      width: 1440,
      height: 900
    });
  } catch (error) {
    return (
      <article
        style={{
          display: "grid",
          gap: "0.75rem",
          border: "1px solid #232a35",
          borderRadius: "0.75rem",
          padding: "0.9rem",
          background: "#11151c"
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>{title}</h2>
        <p style={{ fontSize: "0.825rem", color: "#9da8b7" }}>
          Could not fetch snapshot for {targetUrl}.
        </p>
        <p style={{ fontSize: "0.75rem", color: "#7f8a98" }}>
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </article>
    );
  }

  return (
    <article
      style={{
        display: "grid",
        gap: "0.75rem",
        border: "1px solid #232a35",
        borderRadius: "0.75rem",
        padding: "0.9rem",
        background: "#11151c"
      }}
    >
      <header
        style={{
          display: "grid",
          gap: "0.35rem"
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>{title}</h2>
        <p style={{ fontSize: "0.825rem", color: "#9da8b7" }}>
          Source: {snapshot.sourceUrl}
        </p>
        <p style={{ fontSize: "0.75rem", color: "#7f8a98" }}>
          Captured at {new Date(snapshot.capturedAt).toLocaleString()} ({snapshot.cached ? "cache hit" : "fresh capture"})
        </p>
      </header>

      <img
        src={snapshot.dataUrl}
        alt={`Live screenshot for ${title}`}
        style={{
          width: "100%",
          height: "auto",
          borderRadius: "0.5rem",
          border: "1px solid #2a3342"
        }}
      />
    </article>
  );
}
