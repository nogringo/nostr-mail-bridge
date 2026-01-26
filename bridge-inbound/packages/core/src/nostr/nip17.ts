import { wrapEvent, createRumor } from 'nostr-tools/nip59';
import { getInboundPrivateKey } from './keys.js';
import { publishToRelays } from './client.js';
import { IncomingEmail } from '../types.js';

const KIND_DM = 14;
const PREVIEW_LENGTH = 200;

function formatDmContent(email: IncomingEmail): string {
  const date = new Date(email.timestamp * 1000).toUTCString();

  let bodyPreview = email.text.trim();
  if (bodyPreview.length > PREVIEW_LENGTH) {
    bodyPreview = bodyPreview.substring(0, PREVIEW_LENGTH).trim() + '...';
  }

  return [
    'New email received',
    '',
    `From: ${email.from}`,
    `Subject: ${email.subject}`,
    `Date: ${date}`,
    '',
    '---',
    bodyPreview,
    '---',
    '',
    'Full email available in your Nostr mail client.',
  ].join('\n');
}

export async function sendNip17DmCopy(
  email: IncomingEmail,
  recipientPubkey: string,
  relays: string[]
): Promise<void> {
  const senderPrivateKey = getInboundPrivateKey();
  const message = formatDmContent(email);

  const rumor = createRumor(
    {
      kind: KIND_DM,
      tags: [['p', recipientPubkey]],
      content: message,
    },
    senderPrivateKey
  );
  const wrappedDm = wrapEvent(rumor, senderPrivateKey, recipientPubkey);

  await publishToRelays(wrappedDm, relays);
}
