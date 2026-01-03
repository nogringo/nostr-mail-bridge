// Types
export type {
  IncomingEmail,
  MailgunEventsWebhook,
  MailgunRoutesWebhook,
  MailgunWebhookBody,
} from './types.js';

// Parser
export { parseMailgunWebhook, verifyMailgunSignature } from './parser.js';
