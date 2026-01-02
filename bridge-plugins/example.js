#!/usr/bin/env node

// Simple test plugin that logs emails and accepts all
// Usage: PLUGIN_PATH=./plugins/example.js

let input = '';

process.stdin.on('data', (data) => {
  input += data;
});

process.stdin.on('end', () => {
  const req = JSON.parse(input);

  // Log the request to stderr (so it shows in console)
  console.error('=== Plugin received ===');
  console.error(`Type: ${req.type}`);
  console.error(`From: ${req.event.from}`);
  console.error(`To: ${req.event.to}`);
  console.error(`Subject: ${req.event.subject}`);
  console.error(`Source: ${req.sourceType} (${req.sourceInfo})`);
  console.error('=======================');

  // Accept all emails
  console.log(JSON.stringify({
    id: req.event.senderPubkey || req.event.from,
    action: 'accept',
  }));
});
