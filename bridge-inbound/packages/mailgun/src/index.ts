// Types
export type {
  Attachment,
  IncomingEmail,
  MailgunEventsWebhook,
  MailgunMimeWebhook,
  MailgunRoutesWebhook,
  MailgunWebhookBody,
} from './types.js';

// Parser
export {
  parseMailgunWebhook,
  verifyMailgunSignature,
  type ParseResult,
  type VerifyResult,
} from './parser.js';
