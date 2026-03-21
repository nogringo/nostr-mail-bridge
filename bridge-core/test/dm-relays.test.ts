import { describe, it, expect, beforeAll } from 'vitest';
import { fetchDMRelays, initConfig } from '../src/index.js';

describe('fetchDMRelays', () => {
  beforeAll(() => {
    // Initialize config with some bootstrap relays
    initConfig({
      inboundPrivateKey: '0000000000000000000000000000000000000000000000000000000000000001', // Dummy
      relays: ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'],
    });
  });

  it('should fetch DM relays for a known pubkey', async () => {
    // Russell's pubkey
    const pubkey = 'b22b06b051fd5232966a9344a634d956c3dc33a7f5ecdcad9ed11ddc4120a7f2';
    
    console.log(`🔍 Fetching DM relays for ${pubkey}...`);
    const relays = await fetchDMRelays(pubkey);
    
    console.log(`✅ Found relays: ${relays.join(', ')}`);
    
    expect(Array.isArray(relays)).toBe(true);
    expect(relays.length).toBeGreaterThan(0);
    // At least one relay should be a wss:// URL
    expect(relays[0]).toMatch(/^wss:\/\//);
  }, 20000); // 20s timeout for real network requests

  it('should fetch DM relays for a known pubkey 2', async () => {
    const pubkey = '2b05f1061895cc1904cf506243bca0746cd8f1af6d63470614b7b9a7e0ceb09a';
    
    console.log(`🔍 Fetching DM relays for ${pubkey}...`);
    const relays = await fetchDMRelays(pubkey);
    
    console.log(`✅ Found relays: ${relays.join(', ')}`);
    
    expect(Array.isArray(relays)).toBe(true);
    expect(relays.length).toBeGreaterThan(0);
    // At least one relay should be a wss:// URL
    expect(relays[0]).toMatch(/^wss:\/\//);
  }, 20000); // 20s timeout for real network requests
});
