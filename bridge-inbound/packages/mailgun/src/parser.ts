import { createHmac, timingSafeEqual } from 'crypto';
import type { IncomingEmail, MailgunWebhookBody, MailgunRoutesWebhook } from './types.js';

/** Default max age for webhook timestamps (5 minutes) */
const DEFAULT_MAX_AGE = 300;

export interface VerifyResult {
  valid: boolean;
  error?: string;
}

function isRoutesWebhook(body: MailgunWebhookBody): body is MailgunRoutesWebhook {
  return 'sender' in body || ('from' in body && typeof body.from === 'string');
}

/**
 * Verify Mailgun webhook signature with timing-safe comparison and replay protection
 * @param timestamp - Webhook timestamp
 * @param token - Webhook token
 * @param signature - Webhook signature
 * @param secret - Mailgun webhook signing key (optional, skips verification if not provided)
 * @param maxAge - Maximum age of timestamp in seconds (default: 300)
 */
export function verifyMailgunSignature(
  timestamp: string,
  token: string,
  signature: string,
  secret?: string,
  maxAge: number = DEFAULT_MAX_AGE
): VerifyResult {
  if (!secret) {
    console.warn('Mailgun webhook secret not provided, skipping verification');
    return { valid: true };
  }

  if (!timestamp || !token || !signature) {
    return { valid: false, error: 'Missing required parameters' };
  }

  // Create the expected signature
  const expectedSignature = createHmac('sha256', secret)
    .update(timestamp + token)
    .digest('hex');

  // Compare signatures in a timing-safe manner
  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length ||
      !timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return { valid: false, error: 'Invalid webhook signature' };
  }

  // Check timestamp to prevent replay attacks
  const currentTime = Math.floor(Date.now() / 1000);
  const webhookTime = parseInt(timestamp, 10);

  if (isNaN(webhookTime) || currentTime - webhookTime > maxAge) {
    return { valid: false, error: 'Webhook timestamp expired' };
  }

  return { valid: true };
}

export interface ParseResult {
  email: IncomingEmail | null;
  error?: string;
}

/**
 * Parse Mailgun webhook body into IncomingEmail
 * @param body - Mailgun webhook body
 * @param secret - Mailgun webhook signing key (optional)
 * @returns Parsed email and optional error
 */
export function parseMailgunWebhook(
  body: MailgunWebhookBody,
  secret?: string
): ParseResult {
  // Mailgun routes/store() format (multipart form data)
  if (isRoutesWebhook(body)) {
    const { timestamp, token, signature } = body;

    const verifyResult = verifyMailgunSignature(timestamp, token, signature, secret);
    if (!verifyResult.valid) {
      return { email: null, error: verifyResult.error };
    }

    return {
      email: {
        from: body.sender || body.from,
        to: body.recipient,
        subject: body.subject,
        body: body['body-plain'] || '',
        timestamp: parseInt(timestamp, 10) || Math.floor(Date.now() / 1000),
      },
    };
  }

  // Mailgun events webhook format
  if ('signature' in body && 'event-data' in body) {
    const { timestamp, token, signature } = body.signature;

    const verifyResult = verifyMailgunSignature(timestamp, token, signature, secret);
    if (!verifyResult.valid) {
      return { email: null, error: verifyResult.error };
    }

    const headers = body['event-data'].message.headers;
    return {
      email: {
        from: headers.from,
        to: headers.to,
        subject: headers.subject,
        body: '',
        timestamp: parseInt(timestamp, 10),
      },
    };
  }

  return { email: null, error: 'Unknown webhook format' };
}
