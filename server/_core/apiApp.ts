import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { register3PLWebhookRoutes } from "../webhooks/3pl";
import { createContext } from "./context";
import { registerEmailAuthRoutes } from "./emailAuth";
import { authRateLimit, csrfProtection, sensitiveTrpcRateLimit } from "./requestProtection";

export async function createApiApp() {
  const app = express();
  const server = createServer(app);

  app.set("trust proxy", 1);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use("/api/auth", authRateLimit, csrfProtection);
  app.use("/api/trpc", sensitiveTrpcRateLimit, csrfProtection);

  registerEmailAuthRoutes(app);
  register3PLWebhookRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return { app, server };
}
