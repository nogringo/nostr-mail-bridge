import express from 'express';
import { config } from './config.js';
import { parseMailgunWebhook, type MailgunWebhookBody } from '@nostr-mail/bridge-inbound-mailgun';
import { processIncomingEmail } from '@nostr-mail/bridge-inbound-core';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {
    const { email, error } = parseMailgunWebhook(req.body as MailgunWebhookBody, config.mailgunWebhookSecret);

    if (!email) {
      console.error('Webhook verification failed:', error);
      return res.status(401).json({ error: error || 'Invalid webhook' });
    }

    console.log(`Received email from ${email.from} to ${email.to}`);

    const sourceIP = req.ip || 'mailgun';
    const result = await processIncomingEmail(email, 'mailgun', sourceIP);

    if (result.action === 'reject') {
      return res.status(403).json({ error: result.message || 'Email rejected' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(config.httpPort, () => {
  console.log(`Inbound Mailgun server running on port ${config.httpPort}`);
});
