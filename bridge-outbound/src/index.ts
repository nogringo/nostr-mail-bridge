import { NostrMailClient, Email } from 'nostr-mail';
import { getBridgePrivateKey } from './nostr/keys.js';
import { createOutboundProvider } from './outbound/index.js';
import { config } from './config.js';
import { nip19 } from 'nostr-tools';
import { runPlugin } from '@nostr-mail/bridge-core';
import { fetchProcessedIds, publishProcessedLabel } from './nostr/labels.js';
import { getHeader, replaceHeader } from './utils/mime.js';

const outbound = createOutboundProvider();

let processedEvents = new Set<string>();

function pubkeyToNpub(pubkey: string): string {
  return nip19.npubEncode(pubkey);
}

async function resolveNip05(identifier: string): Promise<string | null> {
  const parts = identifier.split('@');
  if (parts.length !== 2) return null;

  const [name, domain] = parts;
  const url = `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const json = (await response.json()) as { names?: Record<string, string> };
    const pubkey = json?.names?.[name];
    return typeof pubkey === 'string' ? pubkey : null;
  } catch {
    return null;
  }
}

async function validateOrRewriteFrom(
  rawContent: string,
  senderPubkey: string
): Promise<string> {
  const from = await getHeader(rawContent, 'From');

  if (from && from.includes('@')) {
    // Extract email from "Name <email>" format if needed
    const emailMatch = from.match(/<([^>]+)>/) || [null, from];
    const email = emailMatch[1] || from;

    // Try to resolve as NIP-05
    const resolvedPubkey = await resolveNip05(email);

    if (resolvedPubkey === senderPubkey) {
      console.log(`From address ${email} verified via NIP-05`);
      return rawContent;
    }
  }

  // Rewrite From with npub@domain
  const npubFrom = `${pubkeyToNpub(senderPubkey)}@${config.fromDomain}`;
  console.log(`Rewriting From to ${npubFrom}`);
  return await replaceHeader(rawContent, 'From', npubFrom);
}

async function handleEmail(email: Email): Promise<void> {
  // Deduplicate events (using the Gift Wrap ID)
  const eventId = email.giftWrapId || email.id;
  if (processedEvents.has(eventId)) {
    return;
  }

  // The recipient address is in the 'rcpt' tag of the kind 1301 event (according to protocol)
  // or it might be in the 'to' address if it was already parsed
  const rcptTag = email.event.tags.find(t => t[0] === 'rcpt');
  const rcpt = rcptTag ? rcptTag[1] : (email.to[0]?.address);

  if (!rcpt) {
    console.error('No recipient address found for email', email.id);
    return;
  }

  console.log(`Received email from ${email.from.pubkey} to ${rcpt}`);

  // Run plugin filter (if configured)
  try {
    const pluginResult = await runPlugin(config.pluginPath, {
      type: 'outbound',
      event: {
        from: email.from.address,
        to: rcpt,
        subject: email.subject || '',
        text: email.mime,
        senderPubkey: email.from.pubkey || '',
      },
      receivedAt: Math.floor(Date.now() / 1000),
      sourceType: 'nostr',
      sourceInfo: email.event.pubkey,
    });

    if (pluginResult.action !== 'accept') {
      console.log(`Plugin rejected email to ${rcpt}: ${pluginResult.msg}`);
      return;
    }
  } catch (err) {
    console.error(`Plugin error: ${err}`);
    return;
  }

  // Validate From or rewrite with npub
  const rawContent = await validateOrRewriteFrom(email.mime, email.from.pubkey || '');

  try {
    await outbound.send({
      to: rcpt,
      raw: rawContent,
    });
    console.log(`Successfully sent email to ${rcpt}`);

    // Mark as processed (publish label for deduplication)
    processedEvents.add(eventId);
    await publishProcessedLabel(eventId);
  } catch (error) {
    console.error(`Failed to send email:`, error);
  }
}

async function main() {
  console.log('Starting Nostr to Email bridge...');
  console.log(`Using outbound provider: ${outbound.name}`);

  // Load previously processed events from relays (for deduplication)
  processedEvents = await fetchProcessedIds();

  // Initialize NostrMailClient
  const privateKey = getBridgePrivateKey();
  const client = new NostrMailClient(privateKey, config.relays);

  // Start listening for new emails
  client.onEmail(handleEmail);
}

main().catch(console.error);
