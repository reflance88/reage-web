import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes, registerSupabaseOAuthRoutes } from "./oauth";
import { registerEmailAuthRoutes } from "./emailAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { register3PLWebhookRoutes } from "../webhooks/3pl";
// 자체 서버 이전 시 사용: KAKAO_CLIENT_ID, NAVER_CLIENT_ID/SECRET, GOOGLE_CLIENT_ID/SECRET, APP_BASE_URL 환경변수 설정 후 활성화

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
  // 리버스 프록시(Nginx, Cloudflare, Manus proxy 등) 뒤에서 실행될 때
  // req.protocol, req.hostname, req.ip 등이 올바르게 읽히도록 설정
  app.set("trust proxy", true);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Manus OAuth callback (레거시 — 이메일 로그인 콜백용)
  registerOAuthRoutes(app);
  // Supabase OAuth (Google, Kakao) — 소셜 로그인 버튼에서 사용
  registerSupabaseOAuthRoutes(app);
  // Supabase Auth 이메일 인증 엔드포인트
  registerEmailAuthRoutes(app);
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
