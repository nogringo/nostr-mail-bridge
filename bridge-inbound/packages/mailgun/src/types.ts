import type { Attachment as MailparserAttachment } from 'mailparser';

/**
 * Attachment from parsed email
 */
export interface Attachment {
  filename?: string;
  contentType: string;
  content: Buffer;
  size: number;
  contentId?: string;
}

/**
 * Parsed email from Mailgun webhook
 */
export interface IncomingEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  raw: string;
  attachments: Attachment[];
  timestamp: number;
}

/**
 * Mailgun events webhook format (tracking events)
 */
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

/**
 * Mailgun routes MIME format (inbound email with raw MIME)
 * URL must end with /mime to receive this format
 */
export interface MailgunMimeWebhook {
  recipient: string;
  sender: string;
  from: string;
  subject: string;
  'body-mime': string;
  timestamp: string;
  token: string;
  signature: string;
}

/**
 * Mailgun routes/store() format (inbound email - legacy parsed format)
 */
export interface MailgunRoutesWebhook {
  sender: string;
  recipient: string;
  from: string;
  subject: string;
  'body-plain': string;
  'body-html'?: string;
  timestamp: string;
  token: string;
  signature: string;
}

export type MailgunWebhookBody = MailgunEventsWebhook | MailgunMimeWebhook | MailgunRoutesWebhook;
