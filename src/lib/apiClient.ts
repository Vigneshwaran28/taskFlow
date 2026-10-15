// Generic HTTP concerns only: base URL, JSON, credentials, timeout, error normalization.
// Requests go to /api on the same origin; next.config.ts proxies them to the Express server.
// Each request names the workspace of the page it comes from (X-Workspace), so a browser can be signed in to
// several workspaces at once and every tab talks to its own (server: middleware/auth.js).
import { reportMaintenance, type MaintenanceWindow } from "./maintenance";
import { currentWorkspace } from "./tenantPath";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "/api").replace(/\/+$/, "");
const DEFAULT_TIMEOUT_MS = 15000;

const STATUS_MESSAGES: Record<number, string> = {
  400: "The request was invalid.",
  401: "Please sign in again.",
  403: "You don't have permission to do that.",
  404: "The requested item was not found.",
  409: "This item was changed elsewhere. Refresh and try again.",
  422: "Please fix the highlighted fields.",
  429: "Too many requests. Please wait and try again.",
  503: "The service is not ready yet.",
};

export type FieldErrors = Record<string, string>;

/** The single error shape every request rejects with. */
export class ApiError extends Error {
  /** 0 for network failure or timeout */
  readonly status: number;
  readonly code?: string;
  /** Raw backend message (log only) */
  readonly detail?: string;
  readonly fieldErrors: FieldErrors;
  /** The full response body, for errors that carry data (e.g. a possible duplicate record). */
  readonly data?: unknown;

  constructor(init: { status: number; message: string; code?: string; detail?: string; fieldErrors?: FieldErrors; data?: unknown }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.detail = init.detail;
    this.fieldErrors = init.fieldErrors ?? {};
    this.data = init.data;
  }
}

/** Field errors of a failed mutation, or {} (convenient in forms). */
export const fieldErrorsOf = (error: unknown): FieldErrors => (error instanceof ApiError ? error.fieldErrors : {});

/** A message for a form-level alert: only when the error isn't already shown next to fields. */
export const formErrorOf = (error: unknown): string | null => {
  if (!error) return null;
  if (error instanceof ApiError && Object.keys(error.fieldErrors).length) return null;
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
};

let handleUnauthorized: (path: string) => void = () => {};

/** Register the app-level 401 handler once (Providers). */
export function setUnauthorizedHandler(handler: (path: string) => void) {
  handleUnauthorized = handler;
}

export type QueryParams = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

function buildUrl(path: string, params?: QueryParams) {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) value.forEach(item => search.append(key, String(item)));
    else search.set(key, String(value));
  });
  const query = search.toString();
  return `${API_BASE}${path}${query ? `?${query}` : ""}`;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json") ? response.json() : response.text();
}

// Codes whose server messages are written for end users (auth, setup, business rules). Any request that
// fails with a `code` and a `message` shows that message; this list only matters for codes without one.
const GENERIC_CODES = new Set(["VALIDATION_ERROR", "VALIDATION_FAILED", "NOT_FOUND", "INTERNAL"]);

export interface RequestOptions {
  params?: QueryParams;
  signal?: AbortSignal;
  timeout?: number;
}

interface ErrorBody {
  code?: string;
  message?: string;
  errors?: FieldErrors;
}

async function request<T>(method: string, path: string, { params, signal, timeout = DEFAULT_TIMEOUT_MS, body }: RequestOptions & { body?: unknown } = {}): Promise<T> {
  const timeoutSignal = AbortSignal.timeout(timeout);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const workspace = currentWorkspace();
  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(workspace ? { "X-Workspace": workspace } : {}),
        ...(body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError({
      status: 0,
      message: timeoutSignal.aborted ? "The request timed out." : "Can't reach the server. Check your connection.",
    });
  }

  const data = await parseBody(response).catch(() => null);
  if (response.ok) return data as T;

  if (response.status === 401) handleUnauthorized(path);
  // A maintenance window closed the app: the maintenance gate takes over the page (the console is never closed).
  if (response.status === 503 && (data as { code?: string } | null)?.code === "MAINTENANCE" && !path.startsWith("/bunny")) {
    reportMaintenance((data as { maintenance?: MaintenanceWindow }).maintenance ?? null);
  }

  const errorBody = (data && typeof data === "object" ? data : {}) as ErrorBody;
  const code = errorBody.code;
  const userFacing = Boolean(code && errorBody.message && !GENERIC_CODES.has(code));
  throw new ApiError({
    status: response.status,
    message: userFacing ? errorBody.message! : (STATUS_MESSAGES[response.status] ?? "Something went wrong. Please try again."),
    code,
    detail: errorBody.message,
    fieldErrors: errorBody.errors,
    data,
  });
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PATCH", path, { ...options, body }),
  delete: <T = null>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
};

/** A same-origin URL for downloads that the browser should fetch itself (CSV exports); ?ws= names the workspace. */
export const apiUrl = (path: string, params?: QueryParams) => buildUrl(path, { ...params, ws: currentWorkspace() });
