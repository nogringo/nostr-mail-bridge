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
  let skipContinuation = false;

  const newLines: string[] = [];

  for (const line of lines) {
    // Remove \r if present (handle CRLF)
    const cleanLine = line.replace(/\r$/, '');

    // Check if this is a continuation line (starts with space or tab)
    const isContinuation = /^[ \t]/.test(cleanLine);

    // Skip continuation lines of the header we just replaced
    if (skipContinuation && isContinuation) {
      continue;
    }
    skipContinuation = false;

    // Look for the header to replace (only in header section)
    if (!found && cleanLine.trim() !== '') {
      const colonIndex = cleanLine.indexOf(':');
      if (colonIndex > 0) {
        const key = cleanLine.substring(0, colonIndex).toLowerCase().trim();
        if (key === lowerName) {
          found = true;
          skipContinuation = true;
          newLines.push(`${headerName}: ${newValue}`);
          continue;
        }
      }
    }

    newLines.push(cleanLine);
  }

  return newLines.join('\r\n');
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
