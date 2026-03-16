import { wrapEvent, createRumor } from 'nostr-tools/nip59';
import { getInboundPrivateKey } from './keys.js';
import { IncomingEmail } from '../types.js';

const KIND_EMAIL = 1301;

export function createEmailRumor(email: IncomingEmail, recipientPubkey: string) {
  return createRumor(
    {
      kind: KIND_EMAIL,
      tags: [
        ['p', recipientPubkey],
        ['subject', email.subject],
        ['from', email.from],
      ],
      content: email.raw,
    },
    getInboundPrivateKey()
  );
}

export function giftWrapEmail(email: IncomingEmail, recipientPubkey: string) {
  const senderPrivateKey = getInboundPrivateKey();
  const rumor = createEmailRumor(email, recipientPubkey);
  return wrapEvent(rumor, senderPrivateKey, recipientPubkey);
}
