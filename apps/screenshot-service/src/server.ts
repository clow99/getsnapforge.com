import http from "node:http";
import { DiskSnapshotCache } from "./cache.js";
import { closeCaptureBrowser } from "./capture.js";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";

async function startServer(): Promise<http.Server> {
  const config = loadConfig();
  const cache = new DiskSnapshotCache(config.cacheDir);
  await cache.init();

  const app = createApp({ config, cache });
  const server = app.listen(config.port, () => {
    console.log(`Snapforge screenshot service listening on port ${config.port}`);
  });

  const shutdown = async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
    await closeCaptureBrowser();
  };

  process.on("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });

  return server;
}

void startServer().catch((error) => {
  console.error("Failed to start screenshot service:", error);
  process.exit(1);
});
