import { createSnapforgeClient } from "@npmforge/snapforge";

interface BrowserMockupProps {
  url: string;
  ttlOverrideSeconds?: number;
}

function getClient() {
  const baseUrl = process.env.SNAPFORGE_SERVICE_URL;
  const apiKey = process.env.SNAPFORGE_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return createSnapforgeClient({ baseUrl, apiKey });
}

export async function BrowserMockup({
  url,
  ttlOverrideSeconds = 300,
}: BrowserMockupProps) {
  const hostname = new URL(url).hostname;
  const client = getClient();

  if (!client) {
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

  let dataUrl: string | null = null;
  try {
    const snapshot = await client.getSnapshot({
      url,
      ttlOverrideSeconds,
      preset: "1080p",
    });
    dataUrl = snapshot.dataUrl;
  } catch {
    // fall through to skeleton on error
  }

  return (
    <div className="bm">
      <div className="bm__bar">
        <div className="bm__dots">
          <span className="bm__dot bm__dot--red" />
          <span className="bm__dot bm__dot--yellow" />
          <span className="bm__dot bm__dot--green" />
        </div>
        <div className="bm__address">{hostname}</div>
      </div>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`Screenshot of ${hostname}`}
          className="bm__img"
        />
      ) : (
        <div className="bm__skeleton" />
      )}
    </div>
  );
}
