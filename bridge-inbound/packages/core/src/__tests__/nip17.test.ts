import { describe, it, expect, beforeEach, vi } from 'vitest';
import { unwrapEvent } from 'nostr-tools/nip59';
import { hexToBytes } from '@noble/hashes/utils';
import { initConfig } from '../config.js';
import { IncomingEmail } from '../types.js';

vi.mock('../nostr/client.js', () => ({
  publishToRelays: vi.fn().mockResolvedValue(undefined),
}));

import { sendNip17DmCopy } from '../nostr/nip17.js';
import { publishToRelays } from '../nostr/client.js';

const SENDER_PRIVATE_KEY = 'dcbeb7af3482d71af6c6899055f06659e633828d561210cabc5df979e3ea3dec';
const SENDER_PUBKEY = '5facc8092380e7ed8c30cb825862220b6d8683c0605ebedf530105a73ccd590d';

const RECIPIENT_PRIVATE_KEY = 'ec18129002db752e590e5a11ea6dbb62ee0aafcdca975ecd7278034dbdf3d35b';
const RECIPIENT_PUBKEY = '15540205297f38b8cb89af83a6fad7d6b884ba226806812dc57bf958d432c4ab';

const testEmail: IncomingEmail = {
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Test Subject',
  body: 'This is a test email body that should appear in the DM preview.',
  timestamp: 1704067200,
};

describe('nip17 - DM Copy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initConfig({
      inboundPrivateKey: SENDER_PRIVATE_KEY,
      relays: ['wss://relay.example.com'],
      sendDmCopy: true,
    });
  });

  it('should have correct sender pubkey in unwrapped DM', async () => {
    await sendNip17DmCopy(testEmail, RECIPIENT_PUBKEY, ['wss://relay.example.com']);

    const [wrappedEvent] = (publishToRelays as any).mock.calls[0];
    const unwrapped = unwrapEvent(wrappedEvent, hexToBytes(RECIPIENT_PRIVATE_KEY));

    expect(unwrapped.pubkey).toBe(SENDER_PUBKEY);
  });

  it('should include email summary in DM content', async () => {
    await sendNip17DmCopy(testEmail, RECIPIENT_PUBKEY, ['wss://relay.example.com']);

    const [wrappedEvent] = (publishToRelays as any).mock.calls[0];
    const unwrapped = unwrapEvent(wrappedEvent, hexToBytes(RECIPIENT_PRIVATE_KEY));

    expect(unwrapped.content).toContain('New email received');
    expect(unwrapped.content).toContain('From: sender@example.com');
    expect(unwrapped.content).toContain('Subject: Test Subject');
  });

  it('should truncate long email bodies in preview', async () => {
    const longEmail = { ...testEmail, body: 'A'.repeat(300) };

    await sendNip17DmCopy(longEmail, RECIPIENT_PUBKEY, ['wss://relay.example.com']);

    const [wrappedEvent] = (publishToRelays as any).mock.calls[0];
    const unwrapped = unwrapEvent(wrappedEvent, hexToBytes(RECIPIENT_PRIVATE_KEY));

    expect(unwrapped.content).toContain('...');
  });
});
