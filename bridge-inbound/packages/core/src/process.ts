import { IncomingEmail, ProcessResult } from './types.js';
import { extractPubkeyFromEmail } from './email.js';
import { giftWrapEmail } from './nostr/nip59.js';
import { sendNip17DmCopy } from './nostr/nip17.js';
import { fetchDMRelays, publishToRelays } from './nostr/client.js';
import { runPlugin } from './plugin/index.js';
import { getConfig } from './config.js';

export async function processIncomingEmail(
  email: IncomingEmail,
  sourceType: 'smtp' | 'mailgun',
  sourceInfo: string
): Promise<ProcessResult> {
  const config = getConfig();

  // 1. Extract recipient pubkey
  const recipientPubkey = await extractPubkeyFromEmail(email.to);
  if (!recipientPubkey) {
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
        body: email.body,
        recipientPubkey,
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

  // 3. Gift-wrap and publish
  const dmRelays = await fetchDMRelays(recipientPubkey);
  const wrappedEvent = giftWrapEmail(email, recipientPubkey);
  await publishToRelays(wrappedEvent, dmRelays);

  console.log(`Published gift-wrapped event for ${recipientPubkey} to ${dmRelays.length} relays`);

  // 4. Send NIP-17 DM copy if enabled
  if (config.sendDmCopy) {
    try {
      await sendNip17DmCopy(email, recipientPubkey, dmRelays);
      console.log(`Sent NIP-17 DM copy for ${recipientPubkey}`);
    } catch (err) {
      console.error(`Failed to send DM copy: ${err}`);
    }
  }

  return { success: true, action: 'accept' };
}
