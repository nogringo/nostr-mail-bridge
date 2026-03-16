import { SimplePool, useWebSocketImplementation } from 'nostr-tools/pool';
import WebSocket from 'ws';
import { getConfig } from '../config.js';

useWebSocketImplementation(WebSocket);

const pool = new SimplePool();

const KIND_DM_RELAYS = 10050;

export async function fetchDMRelays(pubkey: string): Promise<string[]> {
  const config = getConfig();
  try {
    const event = await pool.get(config.relays, {
      kinds: [KIND_DM_RELAYS],
      authors: [pubkey],
    });

    if (!event) {
      console.log(`No DM relays found for ${pubkey}, using default relays`);
      return config.relays;
    }

    const relays = event.tags
      .filter((tag: string[]) => tag[0] === 'relay')
      .map((tag: string[]) => tag[1])
      .filter((url: string) => url && url.startsWith('wss://'));

    if (relays.length === 0) {
      console.log(`No valid DM relays in event for ${pubkey}, using default relays`);
      return config.relays;
    }

    console.log(`Found ${relays.length} DM relays for ${pubkey}`);
    return relays;
  } catch (error) {
    console.error(`Error fetching DM relays for ${pubkey}:`, error);
    return config.relays;
  }
}

export async function publishToRelays(event: any, relays?: string[]): Promise<void> {
  const config = getConfig();
  const targetRelays = relays || config.relays;
  try {
    await Promise.any(pool.publish(targetRelays, event));
    console.log(`Published to relays: ${targetRelays.join(', ')}`);
  } catch (error) {
    throw new Error('Failed to publish to any relay');
  }
}
