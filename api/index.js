/**
 * Vercel serverless entry — all HTTP traffic is rewritten here (see vercel.json).
 * Re-uses the Express app from src/index.js (no listen() when VERCEL is set).
 */
module.exports = require('../src/index');
