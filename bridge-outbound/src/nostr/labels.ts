import { finalizeEvent } from 'nostr-tools';
import { SimplePool, useWebSocketImplementation } from 'nostr-tools/pool';
import WebSocket from 'ws';
import { getBridgePrivateKey, getBridgePubkey } from './keys.js';
import { config } from '../config.js';

useWebSocketImplementation(WebSocket);

const KIND_LABEL = 1985;
const LABEL_NAMESPACE = 'email.nostr-mail.bridge';

const pool = new SimplePool();

/**
 * Publish a "processed" label for a gift-wrap event (NIP-32)
 * Used for deduplication on restart
 */
export async function publishProcessedLabel(giftWrapId: string): Promise<string> {
  const privateKey = getBridgePrivateKey();

  const event = finalizeEvent(
    {
      kind: KIND_LABEL,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['L', LABEL_NAMESPACE],
        ['l', 'processed', LABEL_NAMESPACE],
        ['e', giftWrapId],
      ],
      content: '',
    },
    privateKey
  );

  await Promise.any(pool.publish(config.relays, event));

  console.log(`Published processed label for ${giftWrapId}`);

  return event.id;
}

/**
 * Fetch all processed labels published by this bridge
 * Returns a Set of gift-wrap IDs that have already been processed
 */
export async function fetchProcessedIds(): Promise<Set<string>> {
  const bridgePubkey = getBridgePubkey();
  const processedIds = new Set<string>();

  console.log('Fetching processed labels from relays...');

  const labels = await pool.querySync(config.relays, {
    kinds: [KIND_LABEL],
    authors: [bridgePubkey],
    '#L': [LABEL_NAMESPACE],
    // Fetch labels from the last 30 days
    since: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60,
  });

  for (const label of labels) {
    const eTag = label.tags.find((t) => t[0] === 'e');
    if (eTag && eTag[1]) {
      processedIds.add(eTag[1]);
    }
  }

  console.log(`Found ${processedIds.size} previously processed events`);

  return processedIds;
}

export { KIND_LABEL, LABEL_NAMESPACE };
