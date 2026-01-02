import crypto from 'crypto';
import { IncomingEmail } from 'inbound-core';
import { config } from './config.js';

// Mailgun events webhook format (tracking events)
export interface MailgunEventsWebhook {
  signature: {
    timestamp: string;
    token: string;
    signature: string;
  };
  'event-data': {
    message: {
      headers: {
        from: string;
        to: string;
        subject: string;
      };
    };
  };
}

// Mailgun routes/store() format (inbound email)
export interface MailgunRoutesWebhook {
  sender: string;
  recipient: string;
  from: string;
  subject: string;
  'body-plain': string;
  timestamp: string;
  token: string;
  signature: string;
}

export type MailgunWebhookBody = MailgunEventsWebhook | MailgunRoutesWebhook;

function isRoutesWebhook(body: MailgunWebhookBody): body is MailgunRoutesWebhook {
  return 'sender' in body || ('from' in body && typeof body.from === 'string');
}

export function verifyMailgunSignature(
  timestamp: string,
  token: string,
  signature: string
): boolean {
  if (!config.mailgunWebhookSecret) {
    console.warn('MAILGUN_WEBHOOK_SECRET not set, skipping verification');
    return true;
  }

  const data = timestamp + token;
  const expectedSignature = crypto
    .createHmac('sha256', config.mailgunWebhookSecret)
    .update(data)
    .digest('hex');

  return expectedSignature === signature;
}

export function parseMailgunWebhook(body: MailgunWebhookBody): IncomingEmail | null {
  // Mailgun routes/store() format (multipart form data)
  if (isRoutesWebhook(body)) {
    const { timestamp, token, signature } = body;

    if (!verifyMailgunSignature(timestamp, token, signature)) {
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

    if (!verifyMailgunSignature(timestamp, token, signature)) {
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
