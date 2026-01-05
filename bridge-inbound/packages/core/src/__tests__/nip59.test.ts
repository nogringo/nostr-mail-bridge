import { describe, it, expect, beforeEach } from 'vitest';
import { getPublicKey } from 'nostr-tools';
import { unwrapEvent } from 'nostr-tools/nip59';
import { hexToBytes } from '@noble/hashes/utils';
import { initConfig } from '../config.js';
import { giftWrapEmail } from '../nostr/nip59.js';
import { IncomingEmail } from '../types.js';

const SENDER_PRIVATE_KEY = 'dcbeb7af3482d71af6c6899055f06659e633828d561210cabc5df979e3ea3dec';
const SENDER_PUBKEY = '5facc8092380e7ed8c30cb825862220b6d8683c0605ebedf530105a73ccd590d';

const RECIPIENT_PRIVATE_KEY = 'ec18129002db752e590e5a11ea6dbb62ee0aafcdca975ecd7278034dbdf3d35b';
const RECIPIENT_PUBKEY = '15540205297f38b8cb89af83a6fad7d6b884ba226806812dc57bf958d432c4ab';

const testEmail: IncomingEmail = {
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Test Subject',
  body: 'This is a test email body.',
  timestamp: 1704067200,
};

describe('nip59 - giftWrapEmail', () => {
  beforeEach(() => {
    initConfig({
      inboundPrivateKey: SENDER_PRIVATE_KEY,
      relays: ['wss://relay.example.com'],
    });
  });

  it('should be decryptable by recipient with correct email content', () => {
    const wrapped = giftWrapEmail(testEmail, RECIPIENT_PUBKEY);
    const unwrapped = unwrapEvent(wrapped, hexToBytes(RECIPIENT_PRIVATE_KEY));

    expect(unwrapped.content).toContain('From: sender@example.com');
    expect(unwrapped.content).toContain('To: recipient@example.com');
    expect(unwrapped.content).toContain('Subject: Test Subject');
  });

  it('should have correct sender pubkey', () => {
    const wrapped = giftWrapEmail(testEmail, RECIPIENT_PUBKEY);
    const unwrapped = unwrapEvent(wrapped, hexToBytes(RECIPIENT_PRIVATE_KEY));

    expect(unwrapped.pubkey).toBe(SENDER_PUBKEY);
  });
});
