import { unwrapEvent } from 'nostr-tools/nip59';
import { getBridgePrivateKey } from './keys.js';
import { UnwrappedEmail } from '../types.js';

const KIND_GIFT_WRAP = 1059;

export function isGiftWrap(event: any): boolean {
  return event.kind === KIND_GIFT_WRAP;
}

export function getHeader(content: string, headerName: string): string | null {
  const lines = content.split('\n');
  const lowerName = headerName.toLowerCase();

  for (const line of lines) {
    if (line.trim() === '') break;
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).toLowerCase();
      if (key === lowerName) {
        return line.substring(colonIndex + 1).trim();
      }
    }
  }
  return null;
}

export function replaceHeader(content: string, headerName: string, newValue: string): string {
  const lines = content.split('\n');
  const lowerName = headerName.toLowerCase();
  let found = false;

  const newLines = lines.map((line) => {
    if (!found && line.trim() !== '') {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).toLowerCase();
        if (key === lowerName) {
          found = true;
          return `${headerName}: ${newValue}`;
        }
      }
    }
    return line;
  });

  return newLines.join('\n');
}

export function unwrapGiftWrap(giftWrap: any): UnwrappedEmail | null {
  try {
    const privateKey = getBridgePrivateKey();
    const rumor = unwrapEvent(giftWrap, privateKey);

    if (!rumor) {
      return null;
    }

    const to = getHeader(rumor.content, 'To');
    if (!to) {
      console.error('No "To" header found in RFC 2822 content');
      return null;
    }

    return {
      senderPubkey: rumor.pubkey,
      to,
      rawContent: rumor.content,
    };
  } catch (error) {
    console.error('Failed to unwrap gift wrap:', error);
    return null;
  }
}
