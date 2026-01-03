import { onRequest } from "firebase-functions/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { parseMailgunWebhook, type MailgunWebhookBody } from "@nostr-mail/bridge-inbound-mailgun";
import { processIncomingEmail, initConfig } from "@nostr-mail/bridge-inbound-core";

// Secrets
const inboundPrivateKey = defineSecret("INBOUND_PRIVATE_KEY");
const mailgunWebhookSecret = defineSecret("MAILGUN_WEBHOOK_SECRET");
const relays = defineSecret("RELAYS");

let initialized = false;

export const mailgunWebhook = onRequest(
  { secrets: [inboundPrivateKey, mailgunWebhookSecret, relays] },
  async (req, res) => {
    // Initialize config on first request
    if (!initialized) {
      initConfig({
        inboundPrivateKey: inboundPrivateKey.value(),
        relays: relays.value().split(","),
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

      const sourceIP = req.ip || "firebase";
      const result = await processIncomingEmail(email, "mailgun", sourceIP);

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
