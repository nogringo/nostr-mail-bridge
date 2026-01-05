export interface IncomingEmail {
  from: string;
  to: string;
  subject: string;
  body: string;
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
