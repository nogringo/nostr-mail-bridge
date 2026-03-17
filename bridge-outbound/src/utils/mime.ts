import PostalMime from 'postal-mime';

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
