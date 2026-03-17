export async function resolveNip05(identifier: string): Promise<string | null> {
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
