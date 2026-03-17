import { config } from '../config.js';
import { resolveNip05 } from '../utils/nip05.js';
import { nip19 } from 'nostr-tools';
import PostalMime from 'postal-mime';

export async function validateFrom(
  rawContent: string,
  senderPubkey: string
): Promise<boolean> {
  const parser = new PostalMime();
  const parsed = await parser.parse(rawContent);

  // Workaround: postal-mime doesn't properly unfold headers (RFC 2822),
  // leaving whitespace artifacts in email addresses.
  let email = parsed.from?.address || parsed.sender?.address;
  if (email) email = email.trim().replace(/\s+/g, '');

  if (!email || !email.includes('@')) {
    console.warn('Invalid FROM header: missing or malformed');
    return false;
  }

  const domain = email.split('@')[1]?.toLowerCase();

  // 1. MUST be the bridge's domain
  if (domain !== config.fromDomain.toLowerCase()) {
    console.warn(`FROM domain ${domain} is not allowed. Must be ${config.fromDomain}`);
    return false;
  }

  // 2. Check if email is npub@domain format (direct pubkey verification)
  const localPart = email.split('@')[0];
  if (localPart.startsWith('npub1')) {
    try {
      const { type, data } = nip19.decode(localPart);
      if (type === 'npub' && data === senderPubkey) {
        console.log(`From address ${email} verified via npub format`);
        return true;
      }
    } catch {
      // Invalid npub format, fall through to NIP-05 verification
    }
  }

  // 3. MUST be verified via NIP-05 to prevent impersonation
  const resolvedPubkey = await resolveNip05(email);

  if (resolvedPubkey !== senderPubkey) {
    console.warn(`NIP-05 verification failed for ${email}. Expected ${senderPubkey}, got ${resolvedPubkey}`);
    return false;
  }

  console.log(`From address ${email} verified via NIP-05 on bridge domain`);
  return true;
}
