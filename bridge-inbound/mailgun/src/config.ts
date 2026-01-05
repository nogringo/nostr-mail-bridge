import dotenv from 'dotenv';
import { initConfig } from '@nostr-mail/bridge-inbound-core';

dotenv.config();

export const config = {
  inboundPrivateKey: process.env.INBOUND_PRIVATE_KEY || '',
  mailgunWebhookSecret: process.env.MAILGUN_WEBHOOK_SECRET || '',
  relays: (process.env.RELAYS || 'wss://relay.damus.io').split(','),
  pluginPath: process.env.PLUGIN_PATH || undefined,
  sendDmCopy: process.env.SEND_DM_COPY === 'true',
  httpPort: parseInt(process.env.HTTP_PORT || '3001', 10),
};

// Initialize core with shared config
initConfig({
  inboundPrivateKey: config.inboundPrivateKey,
  relays: config.relays,
  pluginPath: config.pluginPath,
  sendDmCopy: config.sendDmCopy,
});
