import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./apiClient";

const shouldRetry = (failureCount: number, error: unknown) =>
  failureCount < 2 && error instanceof ApiError && (error.status === 0 || error.status === 429 || error.status >= 500);

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetry, retryDelay: attempt => Math.min(1000 * 2 ** attempt, 8000) },
      mutations: { retry: false },
    },
  });
}

let browserClient: QueryClient | undefined;

/** One client per browser tab; server rendering gets a fresh one per request so nothing leaks between users. */
export function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserClient ??= makeQueryClient();
  return browserClient;
}
