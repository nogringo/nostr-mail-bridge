import { OutboundProvider } from './interface.js';
import { OutgoingEmail } from '../types.js';
import { config } from '../config.js';

export class MailgunProvider implements OutboundProvider {
  name = 'mailgun';

  private apiKey: string;
  private domain: string;
  private baseUrl: string;

  constructor() {
    if (!config.mailgunApiKey) {
      throw new Error('MAILGUN_API_KEY not configured');
    }
    if (!config.mailgunDomain) {
      throw new Error('MAILGUN_DOMAIN not configured');
    }

    this.apiKey = config.mailgunApiKey;
    this.domain = config.mailgunDomain;
    this.baseUrl = `https://api.mailgun.net/v3/${this.domain}`;
  }

  async send(email: OutgoingEmail): Promise<void> {
    const formData = new FormData();
    formData.append('to', email.to);
    formData.append('message', new Blob([email.raw], { type: 'message/rfc2822' }), 'message.mime');

    const response = await fetch(`${this.baseUrl}/messages.mime`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mailgun API error: ${response.status} - ${error}`);
    }

    console.log(`Email sent via Mailgun to ${email.to}`);
  }
}
