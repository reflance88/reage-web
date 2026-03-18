import { createApiApp } from "./apiApp";

let appPromise: Promise<Awaited<ReturnType<typeof createApiApp>>> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = createApiApp();
  }

  return appPromise;
}

function ensurePrefixedUrl(req: { url?: string }, prefix: string) {
  if (!req.url) {
    req.url = prefix;
    return;
  }

  if (req.url.startsWith(prefix)) {
    return;
  }

  const normalizedPath = req.url.startsWith("/") ? req.url : `/${req.url}`;
  req.url = `${prefix}${normalizedPath}`;
}

export function createVercelHandler(prefix?: string) {
  return async function handler(req: { url?: string }, res: unknown) {
    if (prefix) {
      ensurePrefixedUrl(req, prefix);
    }

    const { app } = await getApp();
    return app(req as never, res as never);
  };
}

export default createVercelHandler();
