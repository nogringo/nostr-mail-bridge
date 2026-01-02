# Nostr Mail Bridge

A bidirectional bridge between legacy email systems and the Nostr protocol. Send and receive emails via Nostr using NIP-59 gift-wrapped messages.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Email Client  │────▶│  Bridge Inbound │────▶│  Nostr Relays   │
│   (SMTP/Mailgun)│     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Nostr Relays   │────▶│ Bridge Outbound │────▶│   Email Server  │
│                 │     │                 │     │   (SMTP/Mailgun)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Components

### bridge-inbound/

Handles incoming emails and publishes them to Nostr.

| Module | Description |
|--------|-------------|
| `core/` | Shared logic: NIP-59 wrapping, plugin runner, NIP-05 lookup |
| `smtp/` | SMTP server for receiving emails directly |
| `mailgun/` | Mailgun webhook handler |

### bridge-outbound/

Listens to Nostr gift-wrapped messages and sends them as emails.

- Subscribes to kind 1059 events
- Unwraps NIP-59 encrypted emails
- Sends via SMTP or Mailgun API

### bridge-plugins/

Extensible plugin system for filtering emails.

| Plugin | Description |
|--------|-------------|
| `uid_ovh/` | Dart plugin with NIP-51 whitelist + NIP-85 trust score filtering |

### nip05-service/

NIP-05 discovery service for resolving `user@domain` to Nostr pubkeys.

## Plugin System

Plugins are executables that communicate via JSON over stdin/stdout.

**Input:**
```json
{
  "type": "inbound",
  "event": {
    "from": "sender@example.com",
    "to": "recipient@example.com",
    "subject": "Hello",
    "body": "Message content",
    "senderPubkey": "abc123...",
    "recipientPubkey": "def456..."
  },
  "receivedAt": 1704067200,
  "sourceType": "smtp",
  "sourceInfo": "127.0.0.1"
}
```

**Output:**
```json
{
  "id": "abc123...",
  "action": "accept",
  "msg": "Optional message"
}
```

**Actions:** `accept`, `reject`, `shadowReject`

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `INBOUND_PRIVATE_KEY` | Nostr private key (hex) | Required |
| `RELAYS` | Comma-separated relay URLs | `wss://relay.damus.io` |
| `PLUGIN_PATH` | Path to filter plugin | None |
| `HTTP_PORT` | HTTP server port | `3001` |
| `MAILGUN_WEBHOOK_SECRET` | Mailgun signature validation | None |

## Quick Start

### Inbound (Mailgun)

```bash
cd bridge-inbound/mailgun
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Outbound

```bash
cd bridge-outbound
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Plugin (uid_ovh)

```bash
cd bridge-plugins/uid_ovh
dart pub get
dart compile exe bin/uid_ovh.dart -o build/uid_ovh

# Set PLUGIN_PATH to the compiled binary
export PLUGIN_PATH=/path/to/build/uid_ovh
```

## NIPs Used

- **NIP-01**: Basic protocol
- **NIP-05**: User discovery (`user@domain`)
- **NIP-17**: Private DM relays (kind 10050)
- **NIP-51**: Lists (kind 30000 for whitelist)
- **NIP-59**: Gift-wrapped messages
- **NIP-85**: Trust assertions (kind 30382 for scores)
