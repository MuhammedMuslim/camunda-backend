/**
 * Inbound email webhook -> Camunda process actions.
 *
 * Behavior:
 * - New email (no inReplyTo): start process instance
 * - Reply email (has inReplyTo): correlate/publish message
 */
const { Router } = require('express');

const router = Router();

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    const err = new Error(`Missing environment variable: ${name}`);
    err.status = 500;
    throw err;
  }
  return String(value).trim();
}

function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = process.env.CAMUNDA_API_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  let responseBody = null;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    const err = new Error(`Camunda API call failed with ${response.status}`);
    err.status = 502;
    err.detail = {
      url,
      status: response.status,
      body: responseBody,
    };
    throw err;
  }

  return responseBody;
}

function normalizeEmailInput(body) {
  const raw = body?.email || body || {};
  const headers = raw.headers || {};

  return {
    messageId: raw.messageId || headers['Message-ID'] || headers['message-id'] || null,
    inReplyTo: raw.inReplyTo || headers['In-Reply-To'] || headers['in-reply-to'] || null,
    fromAddress: raw.fromAddress || raw.from || null,
    to: raw.to || null,
    subject: raw.subject || '',
    plainTextBody: raw.plainTextBody || raw.text || '',
    htmlBody: raw.htmlBody || raw.html || '',
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
  };
}

router.post('/inbound', async (req, res, next) => {
  try {
    const currentEmail = normalizeEmailInput(req.body);

    if (!currentEmail.fromAddress) {
      return res.status(400).json({ error: 'Email sender is required (from/fromAddress)' });
    }

    // Reply path -> correlate existing waiting message event
    if (currentEmail.inReplyTo) {
      const correlateUrl = requiredEnv('CAMUNDA_CORRELATE_MESSAGE_URL');
      const messageName = requiredEnv('CAMUNDA_REPLY_MESSAGE_NAME');

      const correlateBody = {
        messageName,
        correlationKey: currentEmail.inReplyTo,
        variables: {
          toolCallResult: currentEmail,
        },
      };

      const responseBody = await postJson(correlateUrl, correlateBody);
      return res.status(200).json({
        action: 'correlated-reply',
        correlationKey: currentEmail.inReplyTo,
        camunda: responseBody,
      });
    }

    // New inbound email -> start new process instance
    const startUrl = requiredEnv('CAMUNDA_START_PROCESS_URL');
    const processStartBody = {
      variables: {
        currentEmail,
      },
    };

    const responseBody = await postJson(startUrl, processStartBody);
    return res.status(201).json({
      action: 'started-process',
      messageId: currentEmail.messageId,
      camunda: responseBody,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
