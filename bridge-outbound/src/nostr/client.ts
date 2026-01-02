import { SimplePool, useWebSocketImplementation } from 'nostr-tools/pool';
import WebSocket from 'ws';
import { config } from '../config.js';
import { getBridgePubkey } from './keys.js';

useWebSocketImplementation(WebSocket);

const pool = new SimplePool();

const KIND_GIFT_WRAP = 1059;

export type EventHandler = (event: any) => void;

export function subscribeToGiftWraps(onEvent: EventHandler): void {
  const bridgePubkey = getBridgePubkey();

  console.log(`Subscribing to gift wraps for ${bridgePubkey}`);
  console.log(`Connecting to relays: ${config.relays.join(', ')}`);

  pool.subscribe(
    config.relays,
    {
      kinds: [KIND_GIFT_WRAP],
      '#p': [bridgePubkey],
    },
    {
      onevent(event) {
        onEvent(event);
      },
      oneose() {
        console.log('End of stored events, listening for new events...');
      },
    }
  );
}
