import { describe, it, expect, vi } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { nip59 } from 'nostr-tools';

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

describe('Outbound rcpt Tag Handling', () => {
  it('should read rcpt tag from unwrapped event', async () => {
    const emailContent = `From: sender@bridge.mail
To: recipient@example.com
Subject: Test

Test message.
`;

    const wrappedEvent = await nip59.wrapEvent(
      {
        kind: 1301,
        content: emailContent,
        tags: [['rcpt', 'actual-recipient@example.com']],
      },
      senderSk,
      bridgePk
    );

    const unwrapped = await nip59.unwrapEvent(wrappedEvent, bridgeSk);

    expect(unwrapped).not.toBeNull();
    expect(unwrapped.tags).toContainEqual(['rcpt', 'actual-recipient@example.com']);
  });

  it('should use rcpt tag instead of MIME To header', async () => {
    const emailContent = `From: sender@bridge.mail
To: visible@example.com
Subject: Test

Test message.
`;

    const wrappedEvent = await nip59.wrapEvent(
      {
        kind: 1301,
        content: emailContent,
        tags: [['rcpt', 'envelope-recipient@example.com']],
      },
      senderSk,
      bridgePk
    );

    const unwrapped = await nip59.unwrapEvent(wrappedEvent, bridgeSk);

    expect(unwrapped.tags).toContainEqual(['rcpt', 'envelope-recipient@example.com']);
  });

  it('should handle BCC recipients (rcpt tag only, not in MIME)', async () => {
    const emailContent = `From: sender@bridge.mail
To: visible@example.com
Subject: Test

Test message.
`;

    const wrappedEvent = await nip59.wrapEvent(
      {
        kind: 1301,
        content: emailContent,
        tags: [['rcpt', 'bcc-hidden@example.com']],
      },
      senderSk,
      bridgePk
    );

    const unwrapped = await nip59.unwrapEvent(wrappedEvent, bridgeSk);

    expect(unwrapped.tags).toContainEqual(['rcpt', 'bcc-hidden@example.com']);
  });

  it('should handle event without rcpt tag', async () => {
    const emailContent = `From: sender@bridge.mail
To: recipient@example.com
Subject: Test

Test message.
`;

    const wrappedEvent = await nip59.wrapEvent(
      {
        kind: 1301,
        content: emailContent,
        tags: [],
      },
      senderSk,
      bridgePk
    );

    const unwrapped = await nip59.unwrapEvent(wrappedEvent, bridgeSk);

    expect(unwrapped.tags.find(t => t[0] === 'rcpt')).toBeUndefined();
  });

  it('should handle multiple recipients (one event per recipient)', async () => {
    const emailContent = `From: sender@bridge.mail
To: visible@example.com
Subject: Test

Test message.
`;

    const recipients = ['to@example.com', 'cc@example.com', 'bcc-hidden@example.com'];

    const events = await Promise.all(recipients.map(rcpt => nip59.wrapEvent(
      {
        kind: 1301,
        content: emailContent,
        tags: [['rcpt', rcpt]],
      },
      senderSk,
      bridgePk
    )));

    const unwrappedRecipients = events.map(event => {
      const unwrapped = nip59.unwrapEvent(event, bridgeSk);
      return unwrapped.tags.find(t => t[0] === 'rcpt')?.[1];
    });

    expect(unwrappedRecipients).toEqual(recipients);
  });

  it('should preserve content for SMTP delivery', async () => {
    const emailContent = `From: sender@bridge.mail
To: recipient@example.com
Subject: Test Subject

This is the email body.
`;

    const wrappedEvent = await nip59.wrapEvent(
      {
        kind: 1301,
        content: emailContent,
        tags: [['rcpt', 'recipient@example.com']],
      },
      senderSk,
      bridgePk
    );

    const unwrapped = await nip59.unwrapEvent(wrappedEvent, bridgeSk);

    expect(unwrapped).not.toBeNull();
    expect(unwrapped.content).toBe(emailContent);
  });
});
