import nodemailer from 'nodemailer';
import { OutboundProvider } from './interface.js';
import { OutgoingEmail } from '../types.js';
import { config } from '../config.js';

export class SmtpProvider implements OutboundProvider {
  name = 'smtp';

  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: config.smtpUser
        ? {
            user: config.smtpUser,
            pass: config.smtpPass,
          }
        : undefined,
    });
  }

  async send(email: OutgoingEmail): Promise<void> {
    await this.transporter.sendMail({
      envelope: {
        to: email.to,
      },
      raw: email.raw,
    });

    console.log(`Email sent via SMTP to ${email.to}`);
  }
}
