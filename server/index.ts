import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_SHELL_FILE = "app.html";
const HOME_PAGE_FILE = "index-main.html";

function getRequestPath(url: string) {
  return new URL(url, "http://localhost").pathname;
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("*", (req, res) => {
    if (getRequestPath(req.originalUrl) === "/") {
      res.sendFile(path.join(staticPath, HOME_PAGE_FILE));
      return;
    }

    res.sendFile(path.join(staticPath, APP_SHELL_FILE));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
