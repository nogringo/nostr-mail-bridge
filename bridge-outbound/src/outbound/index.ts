import { OutboundProvider } from './interface.js';
import { MailgunProvider } from './mailgun.js';
import { SmtpProvider } from './smtp.js';
import { config } from '../config.js';

export function createOutboundProvider(): OutboundProvider {
  switch (config.outboundProvider) {
    case 'mailgun':
      return new MailgunProvider();
    case 'smtp':
    default:
      return new SmtpProvider();
  }
}

export { OutboundProvider } from './interface.js';
