/**
 * SMTP email endpoint.
 */
const { Router } = require('express');
const nodemailer = require('nodemailer');

const router = Router();

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
}

function buildTransportConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const rejectUnauthorized = parseBoolean(process.env.SMTP_REJECT_UNAUTHORIZED, true);

  if (!host || !user || !pass) {
    const err = new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in environment variables.'
    );
    err.status = 500;
    throw err;
  }

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized },
  };
}

function toAddressList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

router.post('/send', async (req, res, next) => {
  try {
    const { to, cc, bcc, subject, text, html, from } = req.body || {};

    const recipients = toAddressList(to);
    if (!recipients.length) {
      return res.status(400).json({ error: 'Field "to" is required' });
    }
    if (!subject || (!text && !html)) {
      return res.status(400).json({
        error: 'Fields "subject" and one of "text" or "html" are required',
      });
    }

    const transporter = nodemailer.createTransport(buildTransportConfig());
    const defaultFrom = process.env.SMTP_FROM || process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from: from || defaultFrom,
      to: recipients,
      cc: toAddressList(cc),
      bcc: toAddressList(bcc),
      subject,
      text,
      html,
    });

    return res.status(200).json({
      message: 'Email sent successfully',
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
