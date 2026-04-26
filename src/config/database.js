const { Pool } = require('pg');
const { parse: parseConnectionString } = require('pg-connection-string');

/**
 * Supabase: set `DATABASE_URL` from Project Settings → Database → Connection string (URI).
 * - Migrations / local scripts: use **Session mode** or **Direct** (port 5432).
 * - Vercel / serverless: use **Transaction pooler** (port 6543, URI often contains `pooler.supabase.com`).
 * If `DATABASE_URL` is unset, falls back to `PGHOST`, `PGPORT`, etc. (local Postgres).
 */
function buildPoolConfig() {
  const url = process.env.DATABASE_URL?.trim();
  const max = process.env.VERCEL ? 1 : 20;
  const idleTimeoutMillis = 30000;
  const connectionTimeoutMillis = 15000;

  if (url) {
    const isSupabase = /supabase\.co/i.test(url);
    // Transaction pooler (6543) + PgBouncer: disable prepared statements or queries can fail.
    const isSupabaseTxPooler =
      isSupabase && (/:6543(\/|\?|$)/.test(url) || /pgbouncer=true/i.test(url));
    return {
      connectionString: url,
      max,
      idleTimeoutMillis,
      connectionTimeoutMillis,
      ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
      ...(isSupabaseTxPooler ? { prepareThreshold: 0 } : {}),
    };
  }

  return {
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(buildPoolConfig());

if (process.env.VERCEL && process.env.DATABASE_URL?.trim()) {
  try {
    const p = parseConnectionString(process.env.DATABASE_URL.trim());
    console.log('[database] Vercel PG target:', p.host, 'port:', p.port || '(default)');
  } catch (e) {
    console.warn('[database] DATABASE_URL parse failed:', e.message);
  }
}

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Execute a query against the database.
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB]', { text: text.substring(0, 80), duration: `${duration}ms`, rows: result.rowCount });
  }
  return result;
}

/**
 * Get a client from the pool for transactions.
 */
async function getClient() {
  return pool.connect();
}

module.exports = { pool, query, getClient };
