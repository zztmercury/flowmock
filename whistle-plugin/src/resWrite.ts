/**
 * resWrite — pipe hook: transparent passthrough.
 *
 * Flow: target server → [resRead] → whistle internal → [resWrite] → client
 *
 * resRead already decoded → patched → re-encoded the response. This hook
 * does nothing — just passes the body through unchanged.
 */

export default (server: any, options: any) => {
  server.on('request', (req: any, res: any) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      res.end(body);
    });
  });
};
