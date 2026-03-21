import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { nip19 } from 'nostr-tools';

/**
 * Unit tests for validateFrom function
 * 
 * Tests the FROM validation logic in isolation
 */

// Mock config FIRST (before any other imports)
vi.mock('../../src/config.js', () => ({
  config: {
    relays: ['wss://relay.example.com'],
    fromDomain: 'bridge.example.com',
    pluginPath: '',
  },
}));

// Mock NIP-05 resolution
const mockNip05Resolution = new Map<string, string>();

vi.mock('../../src/utils/nip05.js', () => ({
  resolveNip05: vi.fn((identifier: string) => {
    return Promise.resolve(mockNip05Resolution.get(identifier) || null);
  }),
}));

// Generate test keys
const senderSk = generateSecretKey();
const senderPk = getPublicKey(senderSk);
const senderNpub = nip19.npubEncode(senderPk);
const otherSk = generateSecretKey();
const otherPk = getPublicKey(otherSk);

// Import after mocks
let validateFrom: (rawContent: string, senderPubkey: string) => Promise<boolean>;

beforeAll(() => {
  // Suppress console output during tests
  vi.spyOn(console, 'log').mockImplementation(() => { });
  vi.spyOn(console, 'warn').mockImplementation(() => { });
  vi.spyOn(console, 'error').mockImplementation(() => { });
});

beforeEach(async () => {
  vi.clearAllMocks();
  mockNip05Resolution.clear();

  const module = await import('../../src/validation/from.js');
  validateFrom = (module as any).validateFrom;
});

describe('validateFrom', () => {
  const createMime = (from: string, to: string, subject: string = 'Test') => {
    return `From: ${from}
To: ${to}
Subject: ${subject}

Test message body.
`;
  };

  describe('valid FROM headers', () => {
    it('should return true for valid FROM with matching NIP-05', async () => {
      mockNip05Resolution.set('alice@bridge.example.com', senderPk);

      const mime = createMime('alice@bridge.example.com', 'bob@example.com');
      const result = await validateFrom(mime, senderPk);

      expect(result).toBe(true);
    });

    it('should return true for FROM with display name and matching NIP-05', async () => {
      mockNip05Resolution.set('alice@bridge.example.com', senderPk);

      const mime = createMime('Alice <alice@bridge.example.com>', 'bob@example.com');
      const result = await validateFrom(mime, senderPk);

      expect(result).toBe(true);
    });

    it('should handle case-insensitive domain matching', async () => {
      mockNip05Resolution.set('alice@BRIDGE.EXAMPLE.COM', senderPk);

      const mime = createMime('alice@BRIDGE.EXAMPLE.COM', 'bob@example.com');
      const result = await validateFrom(mime, senderPk);

      expect(result).toBe(true);
    });
  });

  describe('invalid FROM headers', () => {
    it('should return false for missing FROM header', async () => {
      const mime = `To: bob@example.com
Subject: Test

Body.
`;
      const result = await validateFrom(mime, senderPk);

      expect(result).toBe(false);
    });

    it('should return false for malformed FROM header (no @)', async () => {
      const mime = createMime('Invalid Email', 'bob@example.com');
      const result = await validateFrom(mime, senderPk);

      expect(result).toBe(false);
    });

    it('should return false for wrong domain', async () => {
      const mime = createMime('alice@other-domain.com', 'bob@example.com');
      const result = await validateFrom(mime, senderPk);

      expect(result).toBe(false);
    });

    it('should return false when NIP-05 returns null', async () => {
      mockNip05Resolution.set('alice@bridge.example.com', null as any);

      const mime = createMime('alice@bridge.example.com', 'bob@example.com');
      const result = await validateFrom(mime, senderPk);

      expect(result).toBe(false);
    });

    it('should return false when NIP-05 pubkey mismatch', async () => {
      mockNip05Resolution.set('alice@bridge.example.com', otherPk);

      const mime = createMime('alice@bridge.example.com', 'bob@example.com');
      const result = await validateFrom(mime, senderPk);

      expect(result).toBe(false);
    });

    it('should return false for subdomain mismatch', async () => {
      mockNip05Resolution.set('alice@sub.bridge.example.com', senderPk);

      const mime = createMime('alice@bridge.example.com', 'bob@example.com');
      const result = await validateFrom(mime, senderPk);

      expect(result).toBe(false);
    });

    it('should return true for npub1xxx@bridge.domain', async () => {
      const mime = createMime(`${senderNpub}@bridge.example.com`, 'bob@example.com');
      const result = await validateFrom(mime, senderPk);

      expect(result).toBe(true);
    });

    it('should return true for npub1xxx@bridge.domain', async () => {
      const mime = createMime(`Alice <${senderNpub}@bridge.example.com>`, 'bob@example.com');
      const result = await validateFrom(mime, senderPk);

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty sender pubkey', async () => {
      mockNip05Resolution.set('alice@bridge.example.com', senderPk);

      const mime = createMime('alice@bridge.example.com', 'bob@example.com');
      const result = await validateFrom(mime, '');

      expect(result).toBe(false);
    });

    it('should handle FROM with multiple @ symbols in display name', async () => {
      mockNip05Resolution.set('alice@bridge.example.com', senderPk);

      const mime = createMime('alice@test <alice@bridge.example.com>', 'bob@example.com');
      const result = await validateFrom(mime, senderPk);

      expect(result).toBe(true);
    });

    it('should handle FROM with quotes in display name', async () => {
      mockNip05Resolution.set('alice@bridge.example.com', senderPk);

      const mime = createMime('"Alice, Inc." <alice@bridge.example.com>', 'bob@example.com');
      const result = await validateFrom(mime, senderPk);

      expect(result).toBe(true);
    });

    it('should handle whitespace in FROM header', async () => {
      mockNip05Resolution.set('alice@bridge.example.com', senderPk);

      const mime = `From:  alice@bridge.example.com  
To: bob@example.com
Subject: Test

Body.
`;
      const result = await validateFrom(mime, senderPk);

      expect(result).toBe(true);
    });

    it.skip('should handle RFC 2822 header folding in FROM address', async () => {
      // Folded FROM header
      const mime = `From: ${senderNpub}@bridge
 .example.com
To: bob@example.com
Subject: Test

Body.
`;
      const result = await validateFrom(mime, senderPk);

      expect(result).toBe(true);
    });
  });
});
