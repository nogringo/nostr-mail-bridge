import dotenv from 'dotenv';
import { initConfig } from '@nostr-mail/bridge-inbound-core';

dotenv.config();

export const config = {
  inboundPrivateKey: process.env.INBOUND_PRIVATE_KEY || '',
  relays: (process.env.RELAYS || 'wss://relay.damus.io').split(','),
  pluginPath: process.env.PLUGIN_PATH || undefined,
  sendDmCopy: process.env.SEND_DM_COPY === 'true',

  // SMTP server settings
  smtpPort: parseInt(process.env.SMTP_PORT || '25', 10),
  smtpHost: process.env.SMTP_HOST || '0.0.0.0',
};

// Initialize core with shared config
initConfig({
  inboundPrivateKey: config.inboundPrivateKey,
  relays: config.relays,
  pluginPath: config.pluginPath,
  sendDmCopy: config.sendDmCopy,
});
