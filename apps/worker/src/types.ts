/**
 * Type definitions for Cloudflare Worker environment
 */

export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespaces
  CACHE: KVNamespace;
  RATE_LIMIT: KVNamespace;
  RESULTS: KVNamespace;

  // Durable Objects
  MATCH_COORDINATOR: DurableObjectNamespace;

  // Environment Variables
  BSC_RPC_URL: string;
  ECHO_TOKEN_ADDRESS: string;
  DEXSCREENER_API?: string;
  BITQUERY_API_TOKEN: string;
  FREE_START: string;
  FREE_END: string;
  ALLOWLIST_ADMINS: string;
  ANTHROPIC_API_KEY: string;
  ENVIRONMENT: string;
}
