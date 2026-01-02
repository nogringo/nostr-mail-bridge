import dotenv from 'dotenv';
import { initConfig } from 'inbound-core';

dotenv.config();

export const config = {
  inboundPrivateKey: process.env.INBOUND_PRIVATE_KEY || '',
  mailgunWebhookSecret: process.env.MAILGUN_WEBHOOK_SECRET || '',
  relays: (process.env.RELAYS || 'wss://relay.damus.io').split(','),
  pluginPath: process.env.PLUGIN_PATH || undefined,
  httpPort: parseInt(process.env.HTTP_PORT || '3001', 10),
};

// Initialize inbound-core with shared config
initConfig({
  inboundPrivateKey: config.inboundPrivateKey,
  relays: config.relays,
  pluginPath: config.pluginPath,
});
