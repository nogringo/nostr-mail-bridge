import { getPublicKey } from 'nostr-tools';
import { config } from '../config.js';

export function getBridgePrivateKey(): Uint8Array {
  if (!config.bridgePrivateKey) {
    throw new Error('BRIDGE_PRIVATE_KEY not configured');
  }
  return hexToBytes(config.bridgePrivateKey);
}

export function getBridgePubkey(): string {
  return getPublicKey(getBridgePrivateKey());
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
