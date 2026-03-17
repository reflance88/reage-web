import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const buildAnalyticsScriptUrl = (endpoint: string) => {
  const resolvedEndpoint = new URL(endpoint, window.location.origin);
  if (resolvedEndpoint.pathname.endsWith("/umami")) {
    return resolvedEndpoint.toString();
  }

  const normalizedBase = resolvedEndpoint.toString().endsWith("/")
    ? resolvedEndpoint.toString()
    : `${resolvedEndpoint.toString()}/`;

  return new URL("umami", normalizedBase).toString();
};

const initializeAnalytics = () => {
  if (typeof document === "undefined") return;

  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.trim();
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID?.trim();
  if (!endpoint || !websiteId) return;

  if (document.querySelector('script[data-reage-analytics="umami"]')) return;

  try {
    const script = document.createElement("script");
    script.defer = true;
    script.src = buildAnalyticsScriptUrl(endpoint);
    script.dataset.websiteId = websiteId;
    script.setAttribute("data-reage-analytics", "umami");
    document.head.appendChild(script);
  } catch (error) {
    console.warn("[Analytics] Skipping invalid analytics configuration", error);
  }
};

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

initializeAnalytics();

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
