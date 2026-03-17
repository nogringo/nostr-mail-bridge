import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { config } from './config.js';
import { type IncomingEmail, processIncomingEmail } from '@nostr-mail/bridge-core';

const server = new SMTPServer({
  authOptional: true,
  disabledCommands: ['AUTH'],

  onData(stream, session, callback) {
    let emailData = '';
    // Get envelope recipients captured in onRcptTo
    const envelopeRecipients: string[] = (session as any).envelopeRecipients || [];

    stream.on('data', (chunk) => {
      emailData += chunk.toString();
    });

    stream.on('end', async () => {
      try {
        // Reject if no envelope recipients (RCPT TO missing)
        if (envelopeRecipients.length === 0) {
          console.error('No envelope recipients (RCPT TO missing)');
          callback(new Error('No recipients'));
          return;
        }

        const parsed = await simpleParser(emailData);

        const from =
          typeof parsed.from?.text === 'string'
            ? parsed.from.text
            : parsed.from?.value?.[0]?.address || '';

        const attachments = (parsed.attachments || []).map(att => ({
          filename: att.filename,
          contentType: att.contentType,
          content: att.content,
          size: att.size,
          contentId: att.contentId,
        }));

        // Process each envelope recipient separately (one Nostr event per recipient)
        // This ensures BCC recipients get their own event and proper routing
        const clientIP = session.remoteAddress || 'unknown';
        const results = await Promise.all(
          envelopeRecipients.map(async (recipient) => {
            const email: IncomingEmail = {
              from,
              to: recipient,
              subject: parsed.subject || '(no subject)',
              text: parsed.text || '',
              html: parsed.html || undefined,
              raw: emailData,
              attachments,
              timestamp: Math.floor(Date.now() / 1000),
            };

            console.log(`Processing email from ${email.from} to ${recipient}`);
            return { recipient, result: await processIncomingEmail(email, 'smtp', clientIP) };
          })
        );

        // Log individual rejections but don't fail the whole email
        // Each recipient is processed independently
        results.forEach(({ recipient, result }) => {
          if (result.action === 'reject') {
            console.warn(`Rejected for ${recipient}: ${result.message}`);
          } else if (result.action === 'shadowReject') {
            console.warn(`Shadow rejected for ${recipient}: ${result.message}`);
          } else {
            console.log(`Accepted for ${recipient}`);
          }
        });

        // Always accept at SMTP level - individual recipient failures are logged
        callback();
      } catch (error) {
        console.error('Error processing email:', error);
        callback(new Error('Error processing email'));
      }
    });
  },

  onRcptTo(address, session, callback) {
    // Capture envelope recipients for use in onData
    if (!(session as any).envelopeRecipients) {
      (session as any).envelopeRecipients = [];
    }
    (session as any).envelopeRecipients.push(address.address);
    callback();
  },
});

server.on('error', (err) => {
  console.error('SMTP Server error:', err);
});

server.listen(config.smtpPort, config.smtpHost, () => {
  console.log(`SMTP server listening on ${config.smtpHost}:${config.smtpPort}`);
});
