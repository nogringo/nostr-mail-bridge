export interface OutgoingEmail {
  to: string;
  raw: string;
}

export interface UnwrappedEmail {
  senderPubkey: string;
  rcpt: string; // Envelope recipient from rcpt tag (used for SMTP delivery)
  rawContent: string;
}
