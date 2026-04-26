/**
 * Global error-handling middleware.
 */
function errorHandler(err, req, res, _next) {
  console.error('[ERROR]', err);

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Duplicate entry',
      detail: err.detail,
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Foreign key constraint violation',
      detail: err.detail,
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
}

module.exports = errorHandler;
