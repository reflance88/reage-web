import type { Server } from "http";
import { createApiApp } from "./apiApp";

type CreateAppOptions = {
  mode?: "development" | "production";
  serveClient?: boolean;
};

export async function createApp(options: CreateAppOptions = {}) {
  const mode = options.mode ?? (process.env.NODE_ENV === "development" ? "development" : "production");
  const serveClient = options.serveClient ?? true;
  const { app, server } = await createApiApp();

  if (serveClient) {
    if (mode === "development") {
      const { setupVite } = await import("./vite");
      await setupVite(app, server as Server);
    } else {
      const { serveStatic } = await import("./vite");
      serveStatic(app);
    }
  }

  return { app, server };
}
