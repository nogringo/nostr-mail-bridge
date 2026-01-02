import { getPublicKey } from 'nostr-tools';
import { getConfig } from '../config.js';

export function getInboundPrivateKey(): Uint8Array {
  const config = getConfig();
  if (!config.inboundPrivateKey) {
    throw new Error('inboundPrivateKey not configured');
  }
  return hexToBytes(config.inboundPrivateKey);
}

export function getInboundPubkey(): string {
  return getPublicKey(getInboundPrivateKey());
}

export function getInboundPubkeyBytes(): Uint8Array {
  return hexToBytes(getInboundPubkey());
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
