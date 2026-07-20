/**
 * reqWrite — pipe hook: transparent passthrough (same as resWrite).
 */

export default (server: any, options: any) => {
  server.on('request', (req: any, res: any) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      res.end(Buffer.concat(chunks));
    });
  });
};
