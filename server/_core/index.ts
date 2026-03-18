import "dotenv/config";
import net from "net";
import { createApp } from "./app";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function startServer() {
  const { server } = await createApp();

  const preferredPort = parseInt(process.env.PORT || "3000");
  const portAvailable = await isPortAvailable(preferredPort);

  if (!portAvailable) {
    throw new Error(
      `Port ${preferredPort} is already in use. OAuth redirect URLs must match the exact app origin, so start the app on the configured port or update the Supabase redirect settings.`,
    );
  }

  server.listen(preferredPort, () => {
    console.log(`Server running on http://localhost:${preferredPort}/`);
  });
}

startServer().catch(console.error);
