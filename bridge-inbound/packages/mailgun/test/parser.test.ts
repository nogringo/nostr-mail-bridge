import { parseMailgunWebhook } from '../src/parser.js';
import type { MailgunMimeWebhook } from '../src/types.js';

/**
 * Test demonstrating GitHub noreply address issue
 * 
 * Issue: When GitHub sends notification emails, the To: header contains
 * GitHub's own noreply address (e.g., "nogringo/file-transfer" <file-transfer@noreply.github.com>)
 * instead of the actual recipient's email address.
 * 
 * The envelope recipient (body.recipient) contains the actual address the email was sent to,
 * which should be used for routing decisions.
 */

const npubEmail = "npub1kg4sdvz3l4fr99n2jdz2vdxe2mpacva87hkdetv76ywacsfq5leqquw5te@uid.ovh";

const GITHUB_MIME = `From: "Nogringo" <notifications@github.com>
To: "nogringo/file-transfer" <file-transfer@noreply.github.com>
Subject: [nogringo/file-transfer] New file uploaded
Date: Tue, 3 Mar 2026 10:00:00 +0000
Message-ID: <abc123@github.com>

A new file was uploaded to the repository.
`;

const DIRECT_EMAIL_MIME = `From: "Alice" <alice@example.com>
To: ${npubEmail}
Subject: Test email
Date: Tue, 3 Mar 2026 10:00:00 +0000
Message-ID: <xyz789@opensats.org>

Hello!
`;

function createWebhook(mime: string, recipient: string): MailgunMimeWebhook {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return {
    'body-mime': mime,
    recipient,
    sender: 'sender@example.com',
    from: 'sender@example.com',
    subject: 'Test',
    timestamp,
    token: 'test-token',
    signature: 'test-signature',
  };
}

async function runTests() {
  console.log('=== GitHub Noreply Address Test ===\n');

  // Test 1: GitHub notification
  console.log('Test 1: GitHub notification email');
  console.log('Envelope recipient: npub1kg4...@uid.ovh');
  console.log('To: header: "nogringo/file-transfer" <file-transfer@noreply.github.com>');

  const githubResult = await parseMailgunWebhook(
    createWebhook(GITHUB_MIME, npubEmail),
    undefined
  );

  if (githubResult.email) {
    console.log(`Parsed email.to: ${githubResult.email.to}`);
    console.log(`Expected: ${npubEmail}`);

    if (githubResult.email.to === npubEmail) {
      console.log('✓ PASS: Uses envelope recipient (correct)\n');
    } else {
      console.log('✗ FAIL: Uses To: header instead of envelope recipient\n');
    }
  } else {
    console.log('✗ FAIL: Could not parse email\n');
  }

  // Test 2: Direct email
  console.log('Test 2: Direct email to npub address');
  console.log('Envelope recipient: npub1kg4...@uid.ovh');
  console.log('To: header: npub1kg4...@uid.ovh');

  const directResult = await parseMailgunWebhook(
    createWebhook(DIRECT_EMAIL_MIME, npubEmail),
    undefined
  );

  if (directResult.email) {
    console.log(`Parsed email.to: ${directResult.email.to}`);
    console.log(`Expected: ${npubEmail}`);

    if (directResult.email.to === npubEmail) {
      console.log('✓ PASS: Direct email works correctly\n');
    } else {
      console.log('✗ FAIL: Direct email parsing broken\n');
    }
  } else {
    console.log('✗ FAIL: Could not parse email\n');
  }

  // Test 3: Multiple recipients with Cc
  console.log('Test 3: Email with Cc header');
  const ccMime = `From: sender@example.com
To: someone@example.com
Cc: ${npubEmail}
Subject: Test with Cc
Date: Tue, 3 Mar 2026 10:00:00 +0000

Test message.
`;

  const ccResult = await parseMailgunWebhook(
    createWebhook(ccMime, npubEmail),
    undefined
  );

  if (ccResult.email) {
    console.log(`Parsed email.to: ${ccResult.email.to}`);
    console.log(`Expected: ${npubEmail}`);

    if (ccResult.email.to === npubEmail) {
      console.log('✓ PASS: Cc email uses envelope recipient (correct)\n');
    } else {
      console.log('✗ FAIL: Cc email parsing uses wrong recipient\n');
    }
  } else {
    console.log('✗ FAIL: Could not parse email\n');
  }
}

runTests().catch(console.error);
