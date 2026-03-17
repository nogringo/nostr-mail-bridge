import { NostrMailClient, Email } from 'nostr-mail';
import { getBridgePrivateKey } from './nostr/keys.js';
import { createOutboundProvider } from './outbound/index.js';
import { config } from './config.js';
import { runPlugin } from '@nostr-mail/bridge-core';
import { fetchProcessedIds, publishProcessedLabel } from './nostr/labels.js';
import { validateFrom } from './validation/from.js';

const outbound = createOutboundProvider();

let processedEvents = new Set<string>();

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

  // Validate FROM (must be bridge domain + NIP-05 verified)
  const senderPubkey = email.from.pubkey;
  if (!senderPubkey) {
    console.warn('No sender pubkey found in email');
    return;
  }

  // Run plugin filter (if configured)
  try {
    const pluginResult = await runPlugin(config.pluginPath, {
      type: 'outbound',
      event: {
        from: email.from.address,
        to: rcpt,
        subject: email.subject || '',
        text: email.mime,
        senderPubkey,
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

  // Validate FROM (must be bridge domain + NIP-05 verified)
  if (!await validateFrom(email.mime, senderPubkey)) {
    return;
  }

  try {
    await outbound.send({
      to: rcpt,
      raw: email.mime,
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
