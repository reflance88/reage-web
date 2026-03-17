export const ENV = {
  appId: process.env.VITE_APP_ID ?? "reage-web",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseDatabaseUrl: process.env.SUPABASE_DATABASE_URL ?? "",
};

// Startup validation for critical environment variables
if (!ENV.cookieSecret || ENV.cookieSecret.length < 16) {
  throw new Error(
    "FATAL: JWT_SECRET is missing or too short (must be at least 16 characters). Server cannot start safely."
  );
}
if (!ENV.supabaseUrl) {
  console.warn("WARNING: SUPABASE_URL is not set. Supabase features will not work.");
}
if (!ENV.supabaseServiceRoleKey) {
  console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY is not set. Supabase admin operations will not work.");
}
