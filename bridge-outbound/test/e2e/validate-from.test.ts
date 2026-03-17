import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { EventEmitter } from 'events';

/**
 * E2E tests for bridge-outbound FROM validation
 * 
 * Tests the complete flow: Nostr email reception → FROM validation → SMTP send/reject
 */

// Generate test keys
const bridgeSk = generateSecretKey();
const bridgePk = getPublicKey(bridgeSk);
const senderSk = generateSecretKey();
const senderPk = getPublicKey(senderSk);
const otherSk = generateSecretKey();
const otherPk = getPublicKey(otherSk);

// Mock NIP-05 resolution
const mockNip05Resolution = new Map<string, string>();

// Mock SMTP provider
const mockSend = vi.fn();

// Mock config BEFORE any imports
vi.mock('../../src/config.js', () => ({
  config: {
    relays: ['wss://relay.example.com'],
    fromDomain: 'bridge.example.com',
    pluginPath: '',
  },
}));

vi.mock('../../src/outbound/index.js', () => ({
  createOutboundProvider: () => ({
    send: mockSend,
    name: 'smtp',
  }),
}));

vi.mock('../../src/utils/nip05.js', () => ({
  resolveNip05: vi.fn((identifier: string) => {
    return Promise.resolve(mockNip05Resolution.get(identifier) || null);
  }),
}));

vi.mock('../../src/nostr/labels.js', () => ({
  fetchProcessedIds: () => Promise.resolve(new Set<string>()),
  publishProcessedLabel: () => Promise.resolve(),
}));

// Mock nostr-mail
class MockNostrMailClient extends EventEmitter {
  constructor(_privateKey: Uint8Array, _relays: string[]) {
    super();
  }
  onEmail(handler: (email: any) => void) {
    this.on('email', handler);
  }
  emitEmail(email: any) {
    this.emit('email', email);
  }
}

vi.mock('nostr-mail', () => ({
  NostrMailClient: MockNostrMailClient,
  Email: {},
}));

// Import after mocks
let handleEmail: (email: any) => Promise<void>;

beforeAll(() => {
  // Suppress console output during tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

beforeEach(async () => {
  vi.clearAllMocks();
  mockNip05Resolution.clear();
  mockSend.mockClear();
  
  // Re-import to get fresh instance with mocks
  const module = await import('../../src/index.js');
  handleEmail = (module as any).handleEmail;
});

describe('E2E FROM Validation', () => {
  const createTestEmail = (opts: {
    fromAddress: string;
    fromPubkey: string;
    toAddress: string;
    subject?: string;
    mime?: string;
    id?: string;
    giftWrapId?: string;
  }) => {
    const mime = opts.mime || `From: ${opts.fromAddress}
To: ${opts.toAddress}
Subject: ${opts.subject || 'Test'}

Test message body.
`;
    
    return {
      id: opts.id || 'test-event-id',
      giftWrapId: opts.giftWrapId || 'test-gift-wrap-id',
      from: {
        address: opts.fromAddress,
        pubkey: opts.fromPubkey,
      },
      to: [{ address: opts.toAddress }],
      subject: opts.subject || 'Test',
      mime,
      event: {
        tags: [['rcpt', opts.toAddress]],
        pubkey: opts.fromPubkey,
      },
    };
  };

  it('should send email when FROM is valid (bridge domain + NIP-05 verified)', async () => {
    // Setup: sender's pubkey matches NIP-05 for sender@bridge.example.com
    mockNip05Resolution.set('sender@bridge.example.com', senderPk);

    const email = createTestEmail({
      fromAddress: 'sender@bridge.example.com',
      fromPubkey: senderPk,
      toAddress: 'recipient@example.com',
    });

    await handleEmail(email);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith({
      to: 'recipient@example.com',
      raw: expect.stringContaining('From: sender@bridge.example.com'),
    });
  });

  it('should reject email when FROM domain is not bridge domain', async () => {
    const email = createTestEmail({
      fromAddress: 'sender@other-domain.com',
      fromPubkey: senderPk,
      toAddress: 'recipient@example.com',
    });

    await handleEmail(email);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should reject email when NIP-05 resolution fails (pubkey mismatch)', async () => {
    // Setup: NIP-05 returns different pubkey
    mockNip05Resolution.set('sender@bridge.example.com', otherPk);

    const email = createTestEmail({
      fromAddress: 'sender@bridge.example.com',
      fromPubkey: senderPk, // Different from NIP-05 result
      toAddress: 'recipient@example.com',
    });

    await handleEmail(email);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should reject email when NIP-05 resolution returns null', async () => {
    // Setup: NIP-05 returns null (not found)
    mockNip05Resolution.set('sender@bridge.example.com', null as any);

    const email = createTestEmail({
      fromAddress: 'sender@bridge.example.com',
      fromPubkey: senderPk,
      toAddress: 'recipient@example.com',
    });

    await handleEmail(email);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should reject email when sender pubkey is missing', async () => {
    const email = createTestEmail({
      fromAddress: 'sender@bridge.example.com',
      fromPubkey: '', // Missing pubkey
      toAddress: 'recipient@example.com',
    });
    email.from.pubkey = '';

    await handleEmail(email);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should handle FROM header with display name', async () => {
    mockNip05Resolution.set('sender@bridge.example.com', senderPk);

    const mime = `From: Test Sender <sender@bridge.example.com>
To: recipient@example.com
Subject: Test

Test message.
`;

    const email = createTestEmail({
      fromAddress: 'Test Sender <sender@bridge.example.com>',
      fromPubkey: senderPk,
      toAddress: 'recipient@example.com',
      mime,
      id: 'test-display-name-id',
      giftWrapId: 'test-display-name-gift',
    });

    await handleEmail(email);

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should reject email when FROM header is malformed', async () => {
    const mime = `From: Invalid Email
To: recipient@example.com
Subject: Test

Test message.
`;

    const email = createTestEmail({
      fromAddress: 'Invalid Email',
      fromPubkey: senderPk,
      toAddress: 'recipient@example.com',
      mime,
      id: 'test-malformed-id',
      giftWrapId: 'test-malformed-gift',
    });

    await handleEmail(email);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should handle case-insensitive domain matching', async () => {
    mockNip05Resolution.set('sender@BRIDGE.EXAMPLE.COM', senderPk);

    const email = createTestEmail({
      fromAddress: 'sender@BRIDGE.EXAMPLE.COM',
      fromPubkey: senderPk,
      toAddress: 'recipient@example.com',
      id: 'test-case-insensitive-id',
      giftWrapId: 'test-case-insensitive-gift',
    });

    await handleEmail(email);

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should deduplicate emails by giftWrapId', async () => {
    mockNip05Resolution.set('sender@bridge.example.com', senderPk);

    const email = createTestEmail({
      fromAddress: 'sender@bridge.example.com',
      fromPubkey: senderPk,
      toAddress: 'recipient@example.com',
      id: 'test-dedup-id',
      giftWrapId: 'test-dedup-gift',
    });

    // Send same email twice
    await handleEmail(email);
    await handleEmail(email);

    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
