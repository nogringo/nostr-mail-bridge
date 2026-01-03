// Types
export type {
  IncomingEmail,
  MailgunEventsWebhook,
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
