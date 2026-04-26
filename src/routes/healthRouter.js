/**
 * Health check & status routes.
 */
const { Router } = require('express');
const { query } = require('../config/database');

const router = Router();

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
    if (!hasDbUrl && !hasPgEnv) {
      body.hint =
        'No DATABASE_URL or PGHOST. In Vercel → Settings → Environment Variables, add DATABASE_URL (Supabase Transaction pooler URI, port 6543), then redeploy.';
    } else if (hasDbUrl) {
      body.hint =
        'DATABASE_URL is set but connection failed. Use Supabase pooler host (aws-0-*.pooler.supabase.com:6543), user postgres.[project-ref], include ?pgbouncer=true. See Vercel function logs for the error message.';
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
