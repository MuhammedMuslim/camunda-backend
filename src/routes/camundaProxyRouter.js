/**
 * Proxy inbound absence requests to Camunda connector endpoint.
 * Solves browser CORS/private-network access and preserves binary attachments.
 */
const { Router } = require('express');
const multer = require('multer');

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function requireInboundUrl() {
  const url = process.env.CAMUNDA_INBOUND_URL;
  if (!url || !String(url).trim()) {
    const err = new Error('Missing CAMUNDA_INBOUND_URL environment variable');
    err.status = 500;
    throw err;
  }
  return String(url).trim();
}

router.post('/inbound-proxy', upload.single('documents'), async (req, res, next) => {
  try {
    const camundaUrl = requireInboundUrl();
    const { studentEmail, reason, from, to } = req.body || {};

    if (!studentEmail || !reason || !from || !to) {
      return res.status(400).json({
        error: 'studentEmail, reason, from, and to are required',
      });
    }

    const outbound = new FormData();
    outbound.append('studentEmail', studentEmail);
    outbound.append('reason', reason);
    outbound.append('from', from);
    outbound.append('to', to);

    if (req.file) {
      const mimeType = req.file.mimetype || 'application/pdf';
      const blob = new Blob([req.file.buffer], { type: mimeType });
      outbound.append('documents', blob, req.file.originalname || 'document.pdf');
    }

    const response = await fetch(camundaUrl, {
      method: 'POST',
      body: outbound,
    });

    const responseText = await response.text();
    return res.status(response.status).send(responseText);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
