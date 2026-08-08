import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@artfolio/server/router";

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${import.meta.env.VITE_API_URL}/trpc`,
      fetch: ((url, options) => fetch(url, { ...options, credentials: "include" })) as typeof fetch,
    }),
  ],
});
