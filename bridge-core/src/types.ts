export interface Attachment {
  filename?: string;
  contentType: string;
  content: Buffer;
  size: number;
  contentId?: string;
}

export interface IncomingEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  raw: string;
  attachments: Attachment[];
  timestamp: number;
}

export interface CoreConfig {
  inboundPrivateKey: string;
  relays: string[];
  pluginPath?: string;
  sendDmCopy?: boolean;
}

export interface ProcessResult {
  success: boolean;
  action: 'accept' | 'reject' | 'shadowReject';
  message?: string;
}
