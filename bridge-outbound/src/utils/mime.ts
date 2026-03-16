import PostalMime from 'postal-mime';
import nodemailer from 'nodemailer';
import { Readable } from 'stream';

/**
 * Get a header value reliably using PostalMime
 */
export async function getHeader(content: string, headerName: string): Promise<string | null> {
  const parser = new PostalMime();
  const parsed = await parser.parse(content);
  // PostalMime returns headers as an array of {key, value}
  const header = parsed.headers.find((h: any) => h.key.toLowerCase() === headerName.toLowerCase());
  return header ? header.value : null;
}
  /**
  * Infallible header replacement by rebuilding the MIME message using nodemailer.
  * This ensures RFC compliance, correct encoding, and proper line folding.
  */
  export async function replaceHeader(content: string, headerName: string, newValue: string): Promise<string> {
  const parser = new PostalMime();
  const parsed = await parser.parse(content);

  // Simple transport that returns the MIME as a stream
  const transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true
  });

  // Prepare mail options based on parsed content
  const mailOptions: any = {
    from: parsed.from?.address || '',
    to: parsed.to?.map((t: any) => t.address) || [],
    cc: parsed.cc?.map((t: any) => t.address) || [],
    bcc: parsed.bcc?.map((t: any) => t.address) || [],
    subject: parsed.subject || '',
    text: parsed.text || '',
    html: parsed.html || '',
    attachments: parsed.attachments.map((att: any) => ({
      filename: att.filename,
      content: Buffer.from(att.content),
      contentType: att.mimeType,
      contentId: att.contentId,
      disposition: att.disposition
    })),
    // Pass original headers except the one we want to replace
    headers: parsed.headers
      .filter((h: any) => h.key.toLowerCase() !== headerName.toLowerCase())
      .reduce((acc: any, h: any) => {
        acc[h.key] = h.value;
        return acc;
      }, {})
  };

  // Force the new header
  mailOptions.headers[headerName] = newValue;
  if (headerName.toLowerCase() === 'from') {
    mailOptions.from = newValue;
  }

  // Generate the new MIME
  const info = await transporter.sendMail(mailOptions);
  
  // The streamTransport with buffer: true returns the message as a Buffer
  return (info.message as any).toString();
}
