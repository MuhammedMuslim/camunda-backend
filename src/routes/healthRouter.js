/**
 * Health check & status routes.
 */
const { Router } = require('express');
const { parse: parseConnectionString } = require('pg-connection-string');
const { query } = require('../config/database');

const router = Router();

function tryParseDbUrl(urlString) {
  if (!urlString?.trim()) return null;
  try {
    return parseConnectionString(urlString.trim());
  } catch {
    return null;
  }
}

router.get('/health', async (req, res) => {
  const hasDbUrl = Boolean(process.env.DATABASE_URL?.trim());
  const hasPgEnv = Boolean(process.env.PGHOST);
  try {
    await query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (err) {
    console.error('[health] database check failed:', err.message);
    const body = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    };
    const parsed = hasDbUrl ? tryParseDbUrl(process.env.DATABASE_URL) : null;
    if (parsed?.host) {
      body.resolvedHost = parsed.host;
      if (parsed.port) body.resolvedPort = String(parsed.port);
    }

    if (!hasDbUrl && !hasPgEnv) {
      body.hint =
        'No DATABASE_URL or PGHOST. In Vercel → Settings → Environment Variables, add DATABASE_URL (Supabase Transaction pooler URI, port 6543), then redeploy.';
    } else if (hasDbUrl && !parsed) {
      body.hint =
        'DATABASE_URL could not be parsed. In Vercel, remove surrounding "quotes", line breaks, or spaces; paste the URI from Supabase as one line.';
    } else if (hasDbUrl && err.code === 'ENOTFOUND' && parsed?.host) {
      body.hint =
        `DNS could not resolve host "${parsed.host}". That name is wrong, or your DATABASE_URL was split incorrectly. The usual cause is a password containing @, #, %, or : without URL-encoding—then the hostname is parsed as garbage. Fix: in Supabase → Project Settings → Database, copy the "Transaction pooler" connection string again and replace [YOUR-PASSWORD] in the dashboard (or encode special chars). Use host like aws-0-REGION.pooler.supabase.com (not db.PROJECT.supabase.co on Vercel if you saw DNS issues before).`;
    } else if (hasDbUrl && parsed?.host?.startsWith('db.') && /\.supabase\.co$/i.test(parsed.host)) {
      body.hint =
        'Using direct db.*.supabase.co from serverless often fails (IPv6 / DNS). Switch DATABASE_URL to the Transaction pooler URI (aws-0-*.pooler.supabase.com:6543, user postgres.PROJECT_REF, ?pgbouncer=true).';
    } else if (hasDbUrl) {
      body.hint =
        'DATABASE_URL is set but connection failed. Use Supabase Transaction pooler (port 6543), user postgres.[project-ref], include ?pgbouncer=true. See Vercel function logs for the error message.';
    } else {
      body.hint = 'PG* env connection failed; check credentials and network.';
    }
    if (err.code) {
      body.code = err.code;
    }
    if (process.env.NODE_ENV !== 'production') {
      body.detail = err.message;
    }
    res.status(503).json(body);
  }
});

module.exports = router;
