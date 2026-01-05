import { onRequest } from "firebase-functions/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { parseMailgunWebhook, type MailgunWebhookBody } from "@nostr-mail/bridge-inbound-mailgun";
import { processIncomingEmail, initConfig, extractPubkeyFromEmail, getInboundPubkey } from "@nostr-mail/bridge-inbound-core";
import { uidOvhPlugin } from "./plugins/uid-ovh/index.js";

const inboundPrivateKey = defineSecret("INBOUND_PRIVATE_KEY");
const mailgunWebhookSecret = defineSecret("MAILGUN_WEBHOOK_SECRET");

let initialized = false;

export const mailgunWebhook = onRequest(
  { secrets: [inboundPrivateKey, mailgunWebhookSecret] },
  async (req, res) => {
    if (!initialized) {
      initConfig({
        inboundPrivateKey: inboundPrivateKey.value(),
        relays: process.env.RELAYS?.split(",") || [],
        sendDmCopy: process.env.SEND_DM_COPY === "true",
      });
      initialized = true;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { email, error } = parseMailgunWebhook(
        req.body as MailgunWebhookBody,
        mailgunWebhookSecret.value()
      );

      if (!email) {
        logger.error("Webhook verification failed:", error);
        res.status(401).json({ error: error || "Invalid webhook" });
        return;
      }

      logger.info(`Received email from ${email.from} to ${email.to}`);

      // Extract recipient pubkey
      const recipientPubkey = await extractPubkeyFromEmail(email.to);
      if (!recipientPubkey) {
        res.status(400).json({ error: "Invalid recipient" });
        return;
      }

      // Check if recipient is authorized
      const authorized = await uidOvhPlugin({
        recipientPubkey,
        whitelistOwnerPubkey: getInboundPubkey(),
        relays: process.env.RELAYS?.split(",") || [],
        nip85Relay: process.env.NIP85_RELAY || "",
        nip85ProviderPubkey: process.env.NIP85_PROVIDER_PUBKEY || "",
        minScore: parseInt(process.env.MIN_SCORE || "20", 10),
      });
      if (!authorized) {
        logger.info(`Recipient ${recipientPubkey} not authorized`);
        res.status(403).json({ error: "Recipient not authorized" });
        return;
      }

      const result = await processIncomingEmail(email, "mailgun", "mailgun");

      if (result.action === "reject") {
        res.status(403).json({ error: result.message || "Email rejected" });
        return;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error("Error processing webhook:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
