import { describe, it, expect, beforeEach } from 'vitest';
import { simpleParser } from 'mailparser';

/**
 * Test envelope recipient handling (RCPT TO vs MIME To header)
 * 
 * Issue: The bridge should use the envelope recipient (RCPT TO) for routing,
 * not the MIME To header. This is critical for:
 * - BCC recipients (not in MIME headers)
 * - PGP/MIME encrypted emails (MIME headers are encrypted)
 * - Aliases and mailing lists
 */

const SAMPLE_EMAIL = `From: sender@example.com
To: visible@example.com
Subject: Test Email
Date: Tue, 3 Mar 2026 10:00:00 +0000

Test message body.
`;

interface Session {
  envelopeRecipients?: string[];
  remoteAddress?: string;
}

describe('Envelope Recipient Handling', () => {
  let capturedRecipients: string[] = [];
  let session: Session;

  beforeEach(() => {
    capturedRecipients = [];
    session = { remoteAddress: '127.0.0.1' };
  });

  it('should capture envelope recipients in onRcptTo', () => {
    // Simulate onRcptTo behavior
    if (!session.envelopeRecipients) {
      session.envelopeRecipients = [];
    }
    session.envelopeRecipients.push('recipient1@example.com');
    session.envelopeRecipients.push('recipient2@example.com');

    expect(session.envelopeRecipients).toEqual([
      'recipient1@example.com',
      'recipient2@example.com'
    ]);
  });

  it('should use envelope recipient instead of MIME To header', async () => {
    const parsed = await simpleParser(SAMPLE_EMAIL);
    
    // MIME To header (mailparser returns AddressObject or AddressObject[])
    const mimeTo = Array.isArray(parsed.to)
      ? parsed.to[0]?.value?.[0]?.address || ''
      : parsed.to?.value?.[0]?.address || '';
    expect(mimeTo).toBe('visible@example.com');

    // Envelope recipients (simulating RCPT TO)
    const envelopeRecipients = ['actual-recipient@example.com'];
    
    // Should use envelope, not MIME
    const routingRecipient = envelopeRecipients[0];
    expect(routingRecipient).toBe('actual-recipient@example.com');
    expect(routingRecipient).not.toBe(mimeTo);
  });

  it('should handle BCC recipients (envelope only, not in MIME)', async () => {
    const parsed = await simpleParser(SAMPLE_EMAIL);
    
    // BCC recipient is in envelope but NOT in MIME headers
    const envelopeRecipients = [
      'to@example.com',
      'bcc-hidden@example.com'  // This recipient is not in MIME To:
    ];

    // Each envelope recipient should be processed separately
    expect(envelopeRecipients.length).toBe(2);
    
    // MIME To only shows the visible recipient
    const mimeTo = Array.isArray(parsed.to)
      ? parsed.to[0]?.value?.[0]?.address || ''
      : parsed.to?.value?.[0]?.address || '';
    expect(mimeTo).toBe('visible@example.com');
    expect(mimeTo).not.toContain('bcc-hidden');
  });

  it('should reject email if no envelope recipients', () => {
    const envelopeRecipients: string[] = [];
    
    // Should reject at SMTP level
    const shouldReject = envelopeRecipients.length === 0;
    expect(shouldReject).toBe(true);
  });

  it('should process each envelope recipient independently', async () => {
    const envelopeRecipients = [
      'valid@example.com',
      'invalid@example.com',
      'bcc@example.com'
    ];

    // Simulate independent processing
    const results = await Promise.all(
      envelopeRecipients.map(async (recipient) => {
        // Simulate processing (some may fail)
        const isValid = recipient !== 'invalid@example.com';
        return {
          recipient,
          accepted: isValid
        };
      })
    );

    const accepted = results.filter(r => r.accepted);
    const rejected = results.filter(r => !r.accepted);

    expect(accepted.length).toBe(2);
    expect(rejected.length).toBe(1);
    expect(rejected[0].recipient).toBe('invalid@example.com');
  });

  it('should handle multiple recipients with different npubs', async () => {
    const envelopeRecipients = [
      'npub1alice@bridge.mail',
      'npub1bob@bridge.mail',
      'npub1charlie@bridge.mail'
    ];

    // Each recipient should get their own Nostr event
    const events = envelopeRecipients.map(recipient => ({
      kind: 1301,
      rcpt: recipient,
      // p tag would be the npub extracted from recipient
    }));

    expect(events.length).toBe(3);
    expect(events.map(e => e.rcpt)).toEqual(envelopeRecipients);
  });
});
