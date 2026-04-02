import { NostrMailClient } from 'nostr-mail';
import { IncomingEmail, ProcessResult } from './types.js';
import { extractPubkeyFromEmail } from './email.js';
import { getInboundPrivateKey } from './nostr/keys.js';
import { runPlugin } from './plugin/index.js';
import { getConfig } from './config.js';

//? does this function should be splited
export async function processIncomingEmail(
  email: IncomingEmail,
  sourceType: 'smtp' | 'mailgun',
  sourceInfo: string,
  recipientPubkey?: string
): Promise<ProcessResult> {
  const config = getConfig();
  const privateKey = getInboundPrivateKey();

  // 1. Resolve recipient pubkey (use provided or extract from email)
  //! verify if email.to is the to from enveloppe
  const pubkey = recipientPubkey || await extractPubkeyFromEmail(email.to);
  if (!pubkey) {
    console.error(`Could not extract pubkey from: ${email.to}`);
    return { success: false, action: 'reject', message: 'Invalid recipient' };
  }

  // 2. Run plugin filter (if configured)
  try {
    const pluginResult = await runPlugin(config.pluginPath, {
      type: 'inbound',
      event: {
        from: email.from,
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: email.html,
        recipientPubkey: pubkey,
      },
      receivedAt: email.timestamp,
      sourceType,
      sourceInfo,
    });

    if (pluginResult.action !== 'accept') {
      console.log(`Plugin rejected email from ${email.from}: ${pluginResult.msg}`);
      return {
        success: false,
        action: pluginResult.action,
        message: pluginResult.msg,
      };
    }
  } catch (err) {
    console.error(`Plugin error: ${err}`);
    // On plugin error, reject for safety
    return { success: false, action: 'reject', message: 'Plugin error' };
  }

  // 3. Send via NostrMailClient
  try {
    const client = new NostrMailClient(privateKey, config.relays);

    await client.sendEmail({
      to: pubkey,
      subject: email.subject,
      mime: email.raw,
      selfCopy: false,
    });

    console.log(`Email from ${email.from} processed and sent to ${pubkey}`);
    await client.close();

  } catch (err) {
    console.error(`Failed to send email via Nostr: ${err}`);
    return { success: false, action: 'reject', message: 'Nostr delivery failed' };
  }

  return { success: true, action: 'accept' };
}
