#!/usr/bin/env node

// Whitelist plugin - only allows emails to/from whitelisted addresses or domains
// Configure the whitelist below

const WHITELIST = {
  // Whitelisted email domains (e.g., 'example.com')
  domains: [
    // 'example.com',
    // 'company.org',
  ],

  // Whitelisted email addresses (e.g., 'user@example.com')
  emails: [
    // 'trusted@example.com',
  ],

  // Whitelisted Nostr pubkeys (hex format)
  pubkeys: [
    // 'abc123...',
  ],
};

function isWhitelisted(req) {
  const from = req.event.from.toLowerCase();
  const to = req.event.to.toLowerCase();
  const pubkey = req.event.senderPubkey || req.event.recipientPubkey;

  // Check pubkey whitelist
  if (pubkey && WHITELIST.pubkeys.includes(pubkey)) {
    return true;
  }

  // Check email whitelist
  if (WHITELIST.emails.includes(from) || WHITELIST.emails.includes(to)) {
    return true;
  }

  // Check domain whitelist
  const fromDomain = from.split('@')[1];
  const toDomain = to.split('@')[1];

  if (fromDomain && WHITELIST.domains.includes(fromDomain)) {
    return true;
  }

  if (toDomain && WHITELIST.domains.includes(toDomain)) {
    return true;
  }

  return false;
}

let input = '';

process.stdin.on('data', (data) => {
  input += data;
});

process.stdin.on('end', () => {
  const req = JSON.parse(input);
  const id = req.event.senderPubkey || req.event.from;

  if (isWhitelisted(req)) {
    console.log(JSON.stringify({ id, action: 'accept' }));
  } else {
    console.error(`Rejected: ${req.event.from} -> ${req.event.to} (not whitelisted)`);
    console.log(JSON.stringify({ id, action: 'reject', msg: 'Not whitelisted' }));
  }
});
