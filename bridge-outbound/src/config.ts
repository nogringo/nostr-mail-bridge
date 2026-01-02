import dotenv from 'dotenv';

dotenv.config();

export const config = {
  bridgePrivateKey: process.env.BRIDGE_PRIVATE_KEY || '',
  relays: (process.env.RELAYS || 'wss://relay.damus.io').split(','),

  // Outbound provider: 'smtp' or 'mailgun'
  outboundProvider: process.env.OUTBOUND_PROVIDER || 'smtp',
  fromDomain: process.env.FROM_DOMAIN || '',

  // Plugin path for filtering
  pluginPath: process.env.PLUGIN_PATH || undefined,

  // Mailgun settings
  mailgunApiKey: process.env.MAILGUN_API_KEY || '',
  mailgunDomain: process.env.MAILGUN_DOMAIN || '',

  // SMTP settings
  smtpHost: process.env.SMTP_HOST || 'localhost',
  smtpPort: parseInt(process.env.SMTP_PORT || '25', 10),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
};
