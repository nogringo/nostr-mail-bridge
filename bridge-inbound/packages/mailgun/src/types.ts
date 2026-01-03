/**
 * Parsed email from Mailgun webhook
 */
export interface IncomingEmail {
  from: string;
  to: string;
  subject: string;
  body: string;
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
 * Mailgun routes/store() format (inbound email)
 */
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
