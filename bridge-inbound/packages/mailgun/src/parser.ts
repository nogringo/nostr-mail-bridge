import crypto from 'crypto';
import type { IncomingEmail, MailgunWebhookBody, MailgunRoutesWebhook } from './types.js';

function isRoutesWebhook(body: MailgunWebhookBody): body is MailgunRoutesWebhook {
  return 'sender' in body || ('from' in body && typeof body.from === 'string');
}

/**
 * Verify Mailgun webhook signature
 * @param timestamp - Webhook timestamp
 * @param token - Webhook token
 * @param signature - Webhook signature
 * @param secret - Mailgun webhook signing key (optional, skips verification if not provided)
 */
export function verifyMailgunSignature(
  timestamp: string,
  token: string,
  signature: string,
  secret?: string
): boolean {
  if (!secret) {
    console.warn('Mailgun webhook secret not provided, skipping verification');
    return true;
  }

  const data = timestamp + token;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Parse Mailgun webhook body into IncomingEmail
 * @param body - Mailgun webhook body
 * @param secret - Mailgun webhook signing key (optional)
 * @returns Parsed email or null if invalid/unverified
 */
export function parseMailgunWebhook(
  body: MailgunWebhookBody,
  secret?: string
): IncomingEmail | null {
  // Mailgun routes/store() format (multipart form data)
  if (isRoutesWebhook(body)) {
    const { timestamp, token, signature } = body;

    if (!verifyMailgunSignature(timestamp, token, signature, secret)) {
      return null;
    }

    return {
      from: body.sender || body.from,
      to: body.recipient,
      subject: body.subject,
      body: body['body-plain'] || '',
      timestamp: parseInt(timestamp, 10) || Math.floor(Date.now() / 1000),
    };
  }

  // Mailgun events webhook format
  if ('signature' in body && 'event-data' in body) {
    const { timestamp, token, signature } = body.signature;

    if (!verifyMailgunSignature(timestamp, token, signature, secret)) {
      return null;
    }

    const headers = body['event-data'].message.headers;
    return {
      from: headers.from,
      to: headers.to,
      subject: headers.subject,
      body: '',
      timestamp: parseInt(timestamp, 10),
    };
  }

  return null;
}
