import { describe, it, expect, vi } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { wrapEvent } from 'nostr-tools/nip59';

/**
 * Test envelope recipient handling for outbound emails (Nostr → SMTP)
 *
 * The bridge should use the `rcpt` tag for SMTP routing,
 * not the MIME To header. This is critical for:
 * - BCC recipients (not in MIME headers)
 * - PGP/MIME encrypted emails (MIME headers are encrypted)
 * - Aliases and mailing lists
 */

// Generate test keys
const bridgeSk = generateSecretKey();
const bridgePk = getPublicKey(bridgeSk);
const senderSk = generateSecretKey();

vi.mock('../src/nostr/keys.js', () => ({
  getBridgePrivateKey: () => bridgeSk,
  getBridgePubkey: () => bridgePk,
}));

const { unwrapGiftWrap } = await import('../src/nostr/nip59.js');

describe('Outbound rcpt Tag Handling', () => {
  it('should read rcpt tag from unwrapped event', () => {
    const emailContent = `From: sender@bridge.mail
To: recipient@example.com
Subject: Test

Test message.
`;

    const wrappedEvent = wrapEvent(
      {
        kind: 1301,
        content: emailContent,
        tags: [['rcpt', 'actual-recipient@example.com']],
      },
      senderSk,
      bridgePk
    );

    const unwrapped = unwrapGiftWrap(wrappedEvent);
    
    expect(unwrapped).not.toBeNull();
    expect(unwrapped?.rcpt).toBe('actual-recipient@example.com');
  });

  it('should use rcpt tag instead of MIME To header', () => {
    const emailContent = `From: sender@bridge.mail
To: visible@example.com
Subject: Test

Test message.
`;

    const wrappedEvent = wrapEvent(
      {
        kind: 1301,
        content: emailContent,
        tags: [['rcpt', 'envelope-recipient@example.com']],
      },
      senderSk,
      bridgePk
    );

    const unwrapped = unwrapGiftWrap(wrappedEvent);
    
    expect(unwrapped?.rcpt).toBe('envelope-recipient@example.com');
  });

  it('should handle BCC recipients (rcpt tag only, not in MIME)', () => {
    const emailContent = `From: sender@bridge.mail
To: visible@example.com
Subject: Test

Test message.
`;

    const wrappedEvent = wrapEvent(
      {
        kind: 1301,
        content: emailContent,
        tags: [['rcpt', 'bcc-hidden@example.com']],
      },
      senderSk,
      bridgePk
    );

    const unwrapped = unwrapGiftWrap(wrappedEvent);
    
    expect(unwrapped?.rcpt).toBe('bcc-hidden@example.com');
  });

  it('should reject event without rcpt tag', () => {
    const emailContent = `From: sender@bridge.mail
To: recipient@example.com
Subject: Test

Test message.
`;

    const wrappedEvent = wrapEvent(
      {
        kind: 1301,
        content: emailContent,
        tags: [],
      },
      senderSk,
      bridgePk
    );

    const unwrapped = unwrapGiftWrap(wrappedEvent);
    
    expect(unwrapped).toBeNull();
  });

  it('should handle multiple recipients (one event per recipient)', () => {
    const emailContent = `From: sender@bridge.mail
To: visible@example.com
Subject: Test

Test message.
`;

    const recipients = ['to@example.com', 'cc@example.com', 'bcc-hidden@example.com'];
    
    const events = recipients.map(rcpt => wrapEvent(
      {
        kind: 1301,
        content: emailContent,
        tags: [['rcpt', rcpt]],
      },
      senderSk,
      bridgePk
    ));

    const unwrappedRecipients = events.map(event => unwrapGiftWrap(event)?.rcpt);
    
    expect(unwrappedRecipients).toEqual(recipients);
  });

  it('should preserve rawContent for SMTP delivery', () => {
    const emailContent = `From: sender@bridge.mail
To: recipient@example.com
Subject: Test Subject

This is the email body.
`;

    const wrappedEvent = wrapEvent(
      {
        kind: 1301,
        content: emailContent,
        tags: [['rcpt', 'recipient@example.com']],
      },
      senderSk,
      bridgePk
    );

    const unwrapped = unwrapGiftWrap(wrappedEvent);
    
    expect(unwrapped).not.toBeNull();
    expect(unwrapped?.rawContent).toBe(emailContent);
  });
});
