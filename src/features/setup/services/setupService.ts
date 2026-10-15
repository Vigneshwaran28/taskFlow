import { apiClient } from "@/lib/apiClient";

export interface SqliteSettings {
  client: "sqlite";
  filename: string;
}

export interface PostgresSettings {
  client: "postgres";
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

export type DatabaseSettings = SqliteSettings | PostgresSettings;
export type DatabaseClient = DatabaseSettings["client"];

/** The provider console's sign-in (stored hashed on the server). */
export interface ConsoleAccount {
  username: string;
  password: string;
}

/** A standalone install of one exported workspace (server: config/edition.js); null on the platform. */
export interface StandaloneEdition {
  mode: "standalone";
  slug: string;
  name: string;
  features: string[];
  industry: string;
}

export interface SetupStatus {
  configured: boolean;
  client: DatabaseClient | null;
  /** Older servers leave it out */
  edition?: StandaloneEdition | null;
}

/** Standalone edition: what the wizard imports. */
export interface ImportSummary {
  workspace: { slug: string; name: string };
  features: string[];
  exportedAt: string | null;
  users: number;
  /** Rows in every table */
  rows: number;
}

export interface ConnectionTestResult {
  ok: true;
  version: string;
  createdDatabase: boolean;
}

export interface CompleteSetupInput {
  database: DatabaseSettings;
  /** Not used by a standalone edition (it has no provider console) */
  console?: ConsoleAccount;
  createDatabase: boolean;
}

export interface CompleteSetupResult {
  configured: true;
  /** Workspaces already in the database (0 for a new one) */
  tenants: number;
  /** Standalone edition: where to go next (the workspace's sign-in page) */
  next?: string;
  /** Standalone edition: rows imported per table */
  imported?: Record<string, number>;
}

export const setupService = {
  getStatus: ({ signal }: { signal?: AbortSignal } = {}) => apiClient.get<SetupStatus>("/setup/status", { signal }),

  testConnection: (database: DatabaseSettings, createDatabase: boolean) =>
    apiClient.post<ConnectionTestResult>("/setup/test-connection", { database, createDatabase }, { timeout: 30000 }),

  complete: (input: CompleteSetupInput) => apiClient.post<CompleteSetupResult>("/setup/complete", input, { timeout: 300_000 }),

  getImportSummary: ({ signal }: { signal?: AbortSignal } = {}) => apiClient.get<ImportSummary>("/setup/import-summary", { signal }),
};
