import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { config } from './config.js';
import { type IncomingEmail, processIncomingEmail } from '@nostr-mail/bridge-inbound-core';

const server = new SMTPServer({
  authOptional: true,
  disabledCommands: ['AUTH'],

  onData(stream, session, callback) {
    let emailData = '';

    stream.on('data', (chunk) => {
      emailData += chunk.toString();
    });

    stream.on('end', async () => {
      try {
        const parsed = await simpleParser(emailData);

        const from =
          typeof parsed.from?.text === 'string'
            ? parsed.from.text
            : parsed.from?.value?.[0]?.address || '';

        const to =
          typeof parsed.to === 'string'
            ? parsed.to
            : Array.isArray(parsed.to)
              ? parsed.to[0]?.value?.[0]?.address || ''
              : parsed.to?.value?.[0]?.address || '';

        const attachments = (parsed.attachments || []).map(att => ({
          filename: att.filename,
          contentType: att.contentType,
          content: att.content,
          size: att.size,
          contentId: att.contentId,
        }));

        const email: IncomingEmail = {
          from,
          to,
          subject: parsed.subject || '(no subject)',
          text: parsed.text || '',
          html: parsed.html || undefined,
          raw: emailData,
          attachments,
          timestamp: Math.floor(Date.now() / 1000),
        };

        const clientIP = session.remoteAddress || 'unknown';
        console.log(`Received email from ${email.from} to ${email.to}`);

        const result = await processIncomingEmail(email, 'smtp', clientIP);

        if (result.action === 'reject') {
          callback(new Error(result.message || 'Email rejected'));
        } else {
          callback();
        }
      } catch (error) {
        console.error('Error processing email:', error);
        callback(new Error('Error processing email'));
      }
    });
  },

  onRcptTo(address, session, callback) {
    callback();
  },
});

server.on('error', (err) => {
  console.error('SMTP Server error:', err);
});

server.listen(config.smtpPort, config.smtpHost, () => {
  console.log(`SMTP server listening on ${config.smtpHost}:${config.smtpPort}`);
});
