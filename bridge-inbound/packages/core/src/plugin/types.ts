export interface PluginInput {
  type: 'inbound' | 'outbound';
  event: {
    from: string;
    to: string;
    subject: string;
    body: string;
    senderPubkey?: string;
    recipientPubkey?: string;
  };
  receivedAt: number;
  sourceType: 'smtp' | 'mailgun' | 'nostr';
  sourceInfo: string;
}

export interface PluginOutput {
  id: string;
  action: 'accept' | 'reject' | 'shadowReject';
  msg?: string;
}
