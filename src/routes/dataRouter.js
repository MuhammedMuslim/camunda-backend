/**
 * Generic data router.
 *
 * Implements the REST API contract used by the Camunda RSP connector template:
 *
 *   POST   /api/data/:entity/search   – Lucene-style search
 *   POST   /api/data/:entity          – Create
 *   GET    /api/data/:entity/:key     – Read one
 *   GET    /api/data/:entity          – Read all (paginated)
 *   PUT    /api/data/:entity/:key     – Full update
 *   PATCH  /api/data/:entity/:key     – Partial update
 *   DELETE /api/data/:entity/:key     – Delete
 */

const { Router } = require('express');
const { query } = require('../config/database');
const { getEntityConfig, mapRowToResponse, mapBodyToColumns } = require('../config/entities');
const { parseLuceneQuery } = require('../utils/luceneParser');

const router = Router();

// ─── Middleware: resolve entity config ──────────────────────
function resolveEntity(req, res, next) {
  const config = getEntityConfig(req.params.entity);
  if (!config) {
    return res.status(404).json({ error: `Unknown entity: ${req.params.entity}` });
  }
  req.entityConfig = config;
  next();
}

router.param('entity', resolveEntity);

// ─── SEARCH ─────────────────────────────────────────────────
router.post('/:entity/search', async (req, res, next) => {
  try {
    const { table, reverseMap } = req.entityConfig;
    const { luceneQuery, page = 1, pageSize = 10 } = req.body;

    const { whereClause, params } = parseLuceneQuery(luceneQuery);
    const offset = (page - 1) * pageSize;

    // Count
    const countResult = await query(
      `SELECT COUNT(*) AS total FROM "${table}" WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Fetch
    const dataResult = await query(
      `SELECT * FROM "${table}" WHERE ${whereClause} ORDER BY "key" LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    const items = dataResult.rows.map((row) => mapRowToResponse(row, reverseMap));

    res.json({
      luceneQuery: luceneQuery || '',
      items,
      page,
      pageSize,
      total,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET ALL (paginated) ────────────────────────────────────
router.get('/:entity', async (req, res, next) => {
  try {
    const { table, reverseMap } = req.entityConfig;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    const offset = (page - 1) * pageSize;

    const countResult = await query(`SELECT COUNT(*) AS total FROM "${table}"`);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT * FROM "${table}" ORDER BY "key" LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );

    const items = dataResult.rows.map((row) => mapRowToResponse(row, reverseMap));

    res.json({ items, page, pageSize, total });
  } catch (err) {
    next(err);
  }
});

// ─── GET ONE ────────────────────────────────────────────────
router.get('/:entity/:key', async (req, res, next) => {
  try {
    const { table, reverseMap } = req.entityConfig;
    const result = await query(`SELECT * FROM "${table}" WHERE "key" = $1`, [req.params.key]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(mapRowToResponse(result.rows[0], reverseMap));
  } catch (err) {
    next(err);
  }
});

// ─── CREATE ─────────────────────────────────────────────────
router.post('/:entity', async (req, res, next) => {
  try {
    const { table, fieldMap, reverseMap } = req.entityConfig;
    const { columns, values } = mapBodyToColumns(req.body, fieldMap);

    if (columns.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const result = await query(
      `INSERT INTO "${table}" (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    res.status(201).json(mapRowToResponse(result.rows[0], reverseMap));
  } catch (err) {
    next(err);
  }
});

// ─── FULL UPDATE (PUT) ──────────────────────────────────────
router.put('/:entity/:key', async (req, res, next) => {
  try {
    const { table, fieldMap, reverseMap } = req.entityConfig;
    const { columns, values } = mapBodyToColumns(req.body, fieldMap);

    if (columns.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const setClauses = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    values.push(req.params.key);

    const result = await query(
      `UPDATE "${table}" SET ${setClauses}, "updated_at" = NOW() WHERE "key" = $${values.length} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(mapRowToResponse(result.rows[0], reverseMap));
  } catch (err) {
    next(err);
  }
});

// ─── PARTIAL UPDATE (PATCH) ─────────────────────────────────
router.patch('/:entity/:key', async (req, res, next) => {
  try {
    const { table, fieldMap, reverseMap } = req.entityConfig;
    const { columns, values } = mapBodyToColumns(req.body, fieldMap);

    if (columns.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const setClauses = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    values.push(req.params.key);

    const result = await query(
      `UPDATE "${table}" SET ${setClauses}, "updated_at" = NOW() WHERE "key" = $${values.length} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(mapRowToResponse(result.rows[0], reverseMap));
  } catch (err) {
    next(err);
  }
});

// ─── DELETE ─────────────────────────────────────────────────
router.delete('/:entity/:key', async (req, res, next) => {
  try {
    const { table } = req.entityConfig;
    const result = await query(
      `DELETE FROM "${table}" WHERE "key" = $1 RETURNING *`,
      [req.params.key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ message: 'Deleted successfully', key: parseInt(req.params.key, 10) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
