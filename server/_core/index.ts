import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { register3PLWebhookRoutes } from "../webhooks/3pl";
// 자체 서버 이전 시 사용: KAKAO_CLIENT_ID, NAVER_CLIENT_ID/SECRET, GOOGLE_CLIENT_ID/SECRET, APP_BASE_URL 환경변수 설정 후 활성화
import { registerSocialOAuthRoutes } from "./socialOAuth";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Manus OAuth callback (현재 사용 중)
  registerOAuthRoutes(app);
  // 자체 서버 소셔 OAuth 라우트 (카카오/네이버/구글)
  // 환경변수가 설정된 경우에만 자동 활성화
  if (process.env.KAKAO_CLIENT_ID || process.env.NAVER_CLIENT_ID || process.env.GOOGLE_CLIENT_ID) {
    registerSocialOAuthRoutes(app);
    console.log("[OAuth] Social login routes registered (Kakao/Naver/Google)");
  }
  // 3PL Webhook endpoint
  register3PLWebhookRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
