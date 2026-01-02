import express from 'express';
import { config } from './config.js';
import { parseMailgunWebhook, MailgunWebhookBody } from './mailgun.js';
import { processIncomingEmail } from 'inbound-core';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {
    const email = parseMailgunWebhook(req.body as MailgunWebhookBody);
    if (!email) {
      console.error('Invalid or unverified webhook');
      return res.status(401).json({ error: 'Invalid signature' });
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
  console.log(`Inbound Mailgun service running on port ${config.httpPort}`);
});
