/**
 * Shared helpers for pipe hooks.
 */

import * as crypto from 'crypto';

/** Read all data from a readable stream into a Buffer. */
export function readBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Generate a short flow ID. */
export function genFlowId(url: string, ts: number): string {
  const hash = crypto.createHash('md5').update(`${url}${ts}`).digest('hex');
  return hash.substring(0, 8);
}

/** Deep clone a PB message object or JSON object. */
export async function cloneData(
  data: any,
  protocol: 'protobuf' | 'json',
  pbEngine?: any,
  desc?: string,
  messageType?: string,
  delimited?: boolean
): Promise<any> {
  if (protocol === 'json') {
    return JSON.parse(JSON.stringify(data));
  }
  // PB: re-encode and re-decode for a proper deep copy
  if (pbEngine && desc && messageType) {
    const encoded = await pbEngine.encode(desc, messageType, delimited || false, data);
    return await pbEngine.decode(desc, messageType, delimited || false, encoded);
  }
  return data;
}
