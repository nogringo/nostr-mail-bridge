# @nostr-mail/bridge-inbound-mailgun

Mailgun webhook parser for the Nostr Mail Bridge. Parses and verifies Mailgun webhook payloads.

## Installation

```bash
npm i @nostr-mail/bridge-inbound-mailgun
```

## Usage

```typescript
import { parseMailgunWebhook, type MailgunWebhookBody } from '@nostr-mail/bridge-inbound-mailgun';

// In your webhook handler
app.post('/webhook', (req, res) => {
  const { email, error } = parseMailgunWebhook(
    req.body as MailgunWebhookBody,
    process.env.MAILGUN_WEBHOOK_SECRET
  );

  if (!email) {
    console.error('Webhook verification failed:', error);
    return res.status(401).json({ error });
  }

  console.log(`Email from ${email.from} to ${email.to}`);
  // Process the email...
});
```

## API

### `parseMailgunWebhook(body, secret?)`

Parse a Mailgun webhook body and verify its signature.

- `body` - The webhook request body
- `secret` - Mailgun webhook signing key (optional, skips verification if not provided)

Returns `{ email, error }` where email is `IncomingEmail | null`.

### `verifyMailgunSignature(timestamp, token, signature, secret?, maxAge?)`

Verify a Mailgun webhook signature with timing-safe comparison and replay protection.

- `maxAge` - Maximum age of timestamp in seconds (default: 300)

Returns `{ valid, error }`.

## Types

- `IncomingEmail` - Parsed email with from, to, subject, body, timestamp
- `MailgunWebhookBody` - Union of supported Mailgun webhook formats
- `MailgunRoutesWebhook` - Routes/store() format
- `MailgunEventsWebhook` - Events webhook format

## Security

- Timing-safe signature comparison
- Replay attack protection via timestamp validation
- Supports both Mailgun routes and events webhook formats

## License

MIT
