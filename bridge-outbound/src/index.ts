import { subscribeToGiftWraps } from './nostr/client.js';
import { isGiftWrap, unwrapGiftWrap, getHeader, replaceHeader } from './nostr/nip59.js';
import { createOutboundProvider } from './outbound/index.js';
import { config } from './config.js';
import { nip19 } from 'nostr-tools';
import { runPlugin } from '@nostr-mail-bridge/core';

const outbound = createOutboundProvider();

const processedEvents = new Set<string>();

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
  const from = getHeader(rawContent, 'From');

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
  return replaceHeader(rawContent, 'From', npubFrom);
}

async function handleGiftWrap(event: any): Promise<void> {
  // Deduplicate events
  if (processedEvents.has(event.id)) {
    return;
  }
  processedEvents.add(event.id);

  // Keep set from growing indefinitely
  if (processedEvents.size > 10000) {
    const entries = Array.from(processedEvents);
    entries.slice(0, 5000).forEach((id) => processedEvents.delete(id));
  }

  if (!isGiftWrap(event)) {
    return;
  }

  console.log(`Received gift wrap: ${event.id}`);

  const email = unwrapGiftWrap(event);
  if (!email) {
    console.error('Failed to unwrap gift wrap');
    return;
  }

  console.log(`Unwrapped email from ${email.senderPubkey} to ${email.to}`);

  // Run plugin filter (if configured)
  try {
    const pluginResult = await runPlugin(config.pluginPath, {
      type: 'outbound',
      event: {
        from: getHeader(email.rawContent, 'From') || '',
        to: email.to,
        subject: getHeader(email.rawContent, 'Subject') || '',
        body: email.rawContent,
        senderPubkey: email.senderPubkey,
      },
      receivedAt: Math.floor(Date.now() / 1000),
      sourceType: 'nostr',
      sourceInfo: event.pubkey,
    });

    if (pluginResult.action !== 'accept') {
      console.log(`Plugin rejected email to ${email.to}: ${pluginResult.msg}`);
      return;
    }
  } catch (err) {
    console.error(`Plugin error: ${err}`);
    return;
  }

  // Validate From or rewrite with npub
  const rawContent = await validateOrRewriteFrom(email.rawContent, email.senderPubkey);

  try {
    await outbound.send({
      to: email.to,
      raw: rawContent,
    });
    console.log(`Successfully sent email to ${email.to}`);
  } catch (error) {
    console.error(`Failed to send email:`, error);
  }
}

console.log('Starting Nostr to Email bridge...');
console.log(`Using outbound provider: ${outbound.name}`);

subscribeToGiftWraps(handleGiftWrap);
