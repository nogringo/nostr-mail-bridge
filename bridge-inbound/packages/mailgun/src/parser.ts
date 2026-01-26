import { createHmac, timingSafeEqual } from 'crypto';
import { simpleParser } from 'mailparser';
import type { IncomingEmail, MailgunWebhookBody, MailgunMimeWebhook, MailgunRoutesWebhook, Attachment } from './types.js';

/** Default max age for webhook timestamps (5 minutes) */
const DEFAULT_MAX_AGE = 300;

export interface VerifyResult {
  valid: boolean;
  error?: string;
}

function isMimeWebhook(body: MailgunWebhookBody): body is MailgunMimeWebhook {
  return 'body-mime' in body;
}

function isRoutesWebhook(body: MailgunWebhookBody): body is MailgunRoutesWebhook {
  return 'body-plain' in body;
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
 * Parse Mailgun MIME webhook body into IncomingEmail
 * @param body - Mailgun MIME webhook body
 * @param secret - Mailgun webhook signing key (optional)
 * @returns Parsed email and optional error
 */
async function parseMimeWebhook(
  body: MailgunMimeWebhook,
  secret?: string
): Promise<ParseResult> {
  const { timestamp, token, signature } = body;

  const verifyResult = verifyMailgunSignature(timestamp, token, signature, secret);
  if (!verifyResult.valid) {
    return { email: null, error: verifyResult.error };
  }

  const rawMime = body['body-mime'];

  try {
    const parsed = await simpleParser(rawMime);

    const attachments: Attachment[] = (parsed.attachments || []).map(att => ({
      filename: att.filename,
      contentType: att.contentType,
      content: att.content,
      size: att.size,
      contentId: att.contentId,
    }));

    return {
      email: {
        from: typeof parsed.from?.text === 'string' ? parsed.from.text : body.from,
        to: typeof parsed.to === 'string' ? parsed.to :
            (Array.isArray(parsed.to) ? parsed.to.map(t => t.text).join(', ') :
            (parsed.to?.text || body.recipient)),
        subject: parsed.subject || body.subject || '',
        text: parsed.text || '',
        html: parsed.html || undefined,
        raw: rawMime,
        attachments,
        timestamp: parseInt(timestamp, 10) || Math.floor(Date.now() / 1000),
      },
    };
  } catch (err) {
    return { email: null, error: `Failed to parse MIME: ${err}` };
  }
}

/**
 * Parse Mailgun legacy routes webhook body into IncomingEmail (fallback)
 * @param body - Mailgun routes webhook body
 * @param secret - Mailgun webhook signing key (optional)
 * @returns Parsed email and optional error
 */
function parseRoutesWebhook(
  body: MailgunRoutesWebhook,
  secret?: string
): ParseResult {
  const { timestamp, token, signature } = body;

  const verifyResult = verifyMailgunSignature(timestamp, token, signature, secret);
  if (!verifyResult.valid) {
    return { email: null, error: verifyResult.error };
  }

  // Reconstruct a basic MIME from available fields
  const date = new Date(parseInt(timestamp, 10) * 1000).toUTCString();
  const rawMime = [
    `From: ${body.from}`,
    `To: ${body.recipient}`,
    `Subject: ${body.subject}`,
    `Date: ${date}`,
    '',
    body['body-plain'],
  ].join('\r\n');

  return {
    email: {
      from: body.sender || body.from,
      to: body.recipient,
      subject: body.subject,
      text: body['body-plain'] || '',
      html: body['body-html'] || undefined,
      raw: rawMime,
      attachments: [],
      timestamp: parseInt(timestamp, 10) || Math.floor(Date.now() / 1000),
    },
  };
}

/**
 * Parse Mailgun webhook body into IncomingEmail
 * Supports both MIME format (preferred) and legacy routes format
 * @param body - Mailgun webhook body
 * @param secret - Mailgun webhook signing key (optional)
 * @returns Parsed email and optional error
 */
export async function parseMailgunWebhook(
  body: MailgunWebhookBody,
  secret?: string
): Promise<ParseResult> {
  // MIME format (preferred - URL ends with /mime)
  if (isMimeWebhook(body)) {
    return parseMimeWebhook(body, secret);
  }

  // Legacy routes/store() format (multipart form data)
  if (isRoutesWebhook(body)) {
    return parseRoutesWebhook(body, secret);
  }

  // Mailgun events webhook format (tracking events - no email body)
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
        text: '',
        html: undefined,
        raw: '',
        attachments: [],
        timestamp: parseInt(timestamp, 10),
      },
    };
  }

  return { email: null, error: 'Unknown webhook format' };
}
