import { Alert, Badge, Card, CardBody, CardHeader, Title } from "./ui-client";
import { createSnapforgeClient, type ImageFormat } from "@npmforge/snapforge";

interface LiveSnapshotProps {
  targetUrl: string;
  title: string;
  ttlOverrideSeconds?: number;
  width?: number;
  height?: number;
  format?: ImageFormat;
  quality?: number;
}

function getClient() {
  const baseUrl = process.env.SNAPFORGE_SERVICE_URL;
  const apiKey = process.env.SNAPFORGE_API_KEY;

  if (!baseUrl || !apiKey) {
    return null;
  }

  return createSnapforgeClient({ baseUrl, apiKey });
}

export async function LiveSnapshot({
  targetUrl,
  title,
  ttlOverrideSeconds,
  width = 1440,
  height = 900,
  format,
  quality
}: LiveSnapshotProps) {
  const client = getClient();
  if (!client) {
    return (
      <Card variant="shadow" size="md">
        <CardHeader>
          <Title level="h3" size="sm" weight="semibold">
            {title}
          </Title>
        </CardHeader>
        <CardBody>
          <Alert variant="warning" title="Configuration required">
            Set <code>SNAPFORGE_SERVICE_URL</code> and{" "}
            <code>SNAPFORGE_API_KEY</code> to render live snapshots.
          </Alert>
        </CardBody>
      </Card>
    );
  }

  let snapshot;
  try {
    snapshot = await client.getSnapshot({
      url: targetUrl,
      ttlOverrideSeconds,
      fullPage: true,
      width,
      height,
      format,
      quality
    });
  } catch (error) {
    return (
      <Card variant="shadow" size="md">
        <CardHeader>
          <Title level="h3" size="sm" weight="semibold">
            {title}
          </Title>
        </CardHeader>
        <CardBody>
          <Alert variant="danger" title={`Could not fetch snapshot`}>
            {error instanceof Error ? error.message : "Unknown error"}
          </Alert>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="shadow" size="md" hoverable>
      <CardHeader>
        <div className="snapshot-card__header">
          <Title level="h3" size="sm" weight="semibold">
            {title}
          </Title>
          <Badge
            variant={snapshot.cached ? "success" : "info"}
            size="sm"
            dot
          >
            {snapshot.cached ? "Cache hit" : "Fresh capture"}
          </Badge>
        </div>
        <p className="snapshot-card__meta">
          {snapshot.sourceUrl} &middot;{" "}
          {new Date(snapshot.capturedAt).toLocaleString()}
        </p>
      </CardHeader>
      <CardBody>
        <img
          src={snapshot.dataUrl}
          alt={`Live screenshot of ${title}`}
          className="snapshot-card__image"
        />
      </CardBody>
    </Card>
  );
}
