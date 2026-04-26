/**
 * Camunda Backend – Entry point
 *
 * Provides the REST data API consumed by Camunda BPMN processes
 * (RSP connector template) and connects to a PostgreSQL 18 database.
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const dataRouter = require('./routes/dataRouter');
const healthRouter = require('./routes/healthRouter');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// ─── Routes ─────────────────────────────────────────────────
app.use('/api', healthRouter);
app.use('/api/data', dataRouter);

// ─── Root ───────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'Camunda Backend API',
    version: '1.0.0',
    docs: {
      health: 'GET /api/health',
      search: 'POST /api/data/:entity/search',
      create: 'POST /api/data/:entity',
      getAll: 'GET /api/data/:entity',
      getOne: 'GET /api/data/:entity/:key',
      update: 'PUT /api/data/:entity/:key',
      patch:  'PATCH /api/data/:entity/:key',
      delete: 'DELETE /api/data/:entity/:key',
    },
    entities: [
      'Student',
      'Events',
      'Timeslots',
      'AbsenceRequest',
      'SupportCase',
      'SupportingDocument',
      'PastConversation',
    ],
  });
});

// ─── Error handler (must be last) ───────────────────────────
app.use(errorHandler);

// ─── Start (local / traditional host only — not Vercel serverless) ───
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Camunda Backend running on http://localhost:${PORT}`);
    console.log(`📊 Health check:  http://localhost:${PORT}/api/health`);
    console.log(`📁 Data API:      http://localhost:${PORT}/api/data/:entity\n`);
  });
}

module.exports = app;
