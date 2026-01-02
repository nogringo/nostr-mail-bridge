import { OutgoingEmail } from '../types.js';

export interface OutboundProvider {
  name: string;
  send(email: OutgoingEmail): Promise<void>;
}
