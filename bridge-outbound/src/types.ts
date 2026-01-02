export interface OutgoingEmail {
  to: string;
  raw: string;
}

export interface UnwrappedEmail {
  senderPubkey: string;
  to: string;
  rawContent: string;
}
