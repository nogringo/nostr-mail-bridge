export async function lookupNip05(name: string, domain: string): Promise<string | null> {
  try {
    const url = `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json() as { names?: Record<string, string> };
    return data.names?.[name] || null;
  } catch {
    return null;
  }
}

export async function extractPubkeyFromEmail(email: string): Promise<string | null> {
  const match = email.match(/^([^@]+)@(.+)$/);
  if (!match) return null;

  const [, localPart, domain] = match;

  // If it's a hex pubkey (64 chars)
  if (/^[a-f0-9]{64}$/i.test(localPart)) {
    return localPart.toLowerCase();
  }

  // If it starts with npub1, decode it
  if (localPart.startsWith('npub1')) {
    try {
      const { nip19 } = await import('nostr-tools');
      const decoded = nip19.decode(localPart);
      if (decoded.type === 'npub') {
        return decoded.data as string;
      }
    } catch {
      // Fall through to NIP-05 lookup
    }
  }

  // Lookup via NIP-05
  return lookupNip05(localPart, domain);
}
