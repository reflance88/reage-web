import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

const APP_SHELL_FILE = "app.html";
const HOME_PAGE_FILE = "index-main.html";

function getRequestPath(url: string) {
  return new URL(url, "http://localhost").pathname;
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    const requestPath = getRequestPath(url);

    try {
      if (requestPath === "/") {
        res.sendFile(
          path.resolve(import.meta.dirname, "../..", "client", "public", HOME_PAGE_FILE)
        );
        return;
      }

      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        APP_SHELL_FILE
      );

      // Always reload the app shell from disk in case it changes.
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  app.use("*", (req, res) => {
    const requestPath = getRequestPath(req.originalUrl);

    if (requestPath === "/") {
      res.sendFile(path.resolve(distPath, HOME_PAGE_FILE));
      return;
    }

    res.sendFile(path.resolve(distPath, APP_SHELL_FILE));
  });
}
