import { verifyEvent } from 'nostr-tools';
import { SimplePool, useWebSocketImplementation } from 'nostr-tools/pool';
import WebSocket from 'ws';

useWebSocketImplementation(WebSocket);

const WHITELIST_NAME = 'email-whitelist';

export interface UidOvhOptions {
  recipientPubkey: string;
  whitelistOwnerPubkey: string;
  relays: string[];
  nip85Relay: string;
  nip85ProviderPubkey: string;
  minScore: number;
}

async function getWhitelist(pool: SimplePool, relays: string[], ownerPubkey: string): Promise<Set<string>> {
  const event = await pool.get(relays, {
    kinds: [30000],
    authors: [ownerPubkey],
    '#d': [WHITELIST_NAME],
  });

  const pubkeys = new Set<string>();
  if (event && verifyEvent(event)) {
    for (const tag of event.tags) {
      if (tag[0] === 'p' && tag[1]) pubkeys.add(tag[1]);
    }
  }
  return pubkeys;
}

async function getScore(pool: SimplePool, pubkey: string, nip85Relay: string, nip85ProviderPubkey: string): Promise<number | null> {
  const event = await pool.get([nip85Relay], {
    kinds: [30382],
    authors: [nip85ProviderPubkey],
    '#d': [pubkey],
  });

  if (!event || !verifyEvent(event)) return null;

  for (const tag of event.tags) {
    if (tag[0] === 'rank' && tag[1]) {
      const rank = parseInt(tag[1], 10);
      return isNaN(rank) ? null : rank;
    }
  }
  return null;
}

export async function uidOvhPlugin(options: UidOvhOptions): Promise<boolean> {
  const { recipientPubkey, whitelistOwnerPubkey, relays, nip85Relay, nip85ProviderPubkey, minScore } = options;
  const pool = new SimplePool();

  try {
    // TODO: séquentiel vs parallèle?
    // - Si majorité whitelistés → séquentiel optimal (évite fetch score)
    // - Si majorité non whitelistés → paralléliser serait plus rapide
    const whitelist = await getWhitelist(pool, relays, whitelistOwnerPubkey);
    console.log(`uid-ovh: Whitelist: ${whitelist.size} entries`);

    if (whitelist.has(recipientPubkey)) {
      console.log(`uid-ovh: ${recipientPubkey} whitelisted`);
      return true;
    }

    const score = await getScore(pool, recipientPubkey, nip85Relay, nip85ProviderPubkey);
    console.log(`uid-ovh: Score for ${recipientPubkey}: ${score}`);

    if (score !== null && score > minScore) {
      console.log(`uid-ovh: Score ${score} > ${minScore}, accepted`);
      return true;
    }

    console.log(`uid-ovh: ${recipientPubkey} rejected`);
    return false;
  } finally {
    pool.close(relays);
    pool.close([nip85Relay]);
  }
}
