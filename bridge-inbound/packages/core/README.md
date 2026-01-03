# @nostr-mail/bridge-inbound-core

Core library for the Nostr Mail Bridge inbound system. Handles email-to-Nostr message processing using NIP-59 gift wrap encryption.

## Installation

```bash
npm i @nostr-mail/bridge-inbound-core
```

## Usage

```typescript
import { processIncomingEmail, initConfig, type IncomingEmail } from '@nostr-mail/bridge-inbound-core';

// Initialize configuration
initConfig({
  inboundPrivateKey: 'your-hex-private-key',
  relays: ['wss://relay.damus.io', 'wss://nos.lol'],
  pluginPath: './plugin.js', // optional
});

// Process an incoming email
const email: IncomingEmail = {
  from: 'sender@example.com',
  to: 'npub1abc...@nostr-mail.example.com',
  subject: 'Hello',
  body: 'Message content',
  timestamp: Math.floor(Date.now() / 1000),
};

const result = await processIncomingEmail(email, 'smtp', '127.0.0.1');

if (result.action === 'accept') {
  console.log('Email processed successfully');
} else {
  console.log('Email rejected:', result.message);
}
```

## API

### `initConfig(config)`

Initialize the core configuration.

### `processIncomingEmail(email, sourceType, sourceIP)`

Process an incoming email and publish it to Nostr relays as a NIP-59 gift wrap.

### Types

- `IncomingEmail` - Email structure with from, to, subject, body, timestamp
- `ProcessResult` - Result with action ('accept' | 'reject') and optional message

## License

MIT
