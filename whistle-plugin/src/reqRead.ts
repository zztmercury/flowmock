/**
 * reqRead — pipe hook: request decode → patch → re-encode.
 *
 * Flow: client → [reqRead] → whistle internal → [reqWrite] → target server
 *
 * Same logic as resRead but for request bodies. Handles PB/JSON request bodies
 * that may carry desc/messageType in the request Content-Type.
 */

import { detect, type DetectInfo } from './content-type';
import { pbEngine, rules, flowStore } from './ctx';
import { readBody, genFlowId, cloneData } from './helpers';
import * as zlib from 'zlib';

export default (server: any, options: any) => {
  server.on('request', async (req: any, res: any) => {
    const fullUrl = req.originalReq?.fullUrl || '';
    // In pipe reqRead, request headers are in req.headers
    const reqHeaders = req.headers || {};
    const ct = reqHeaders['content-type'] || '';
    const encoding = reqHeaders['content-encoding'] || '';
    const method = req.originalReq?.method || 'GET';

    let body = await readBody(req);

    // Decompress if needed
    let decompressed = body;
    if (encoding.includes('gzip')) {
      try { decompressed = zlib.gunzipSync(body); } catch {}
    } else if (encoding.includes('deflate')) {
      try { decompressed = zlib.inflateSync(body); } catch {}
    } else if (encoding.includes('br')) {
      try { decompressed = zlib.brotliDecompressSync(body); } catch {}
    }

    const info: DetectInfo | null = detect(ct, decompressed);

    if (!info) {
      res.end(body);
      return;
    }

    const flowId = genFlowId(`${fullUrl}#req`, Date.now());

    try {
      let decoded: any;
      if (info.protocol === 'protobuf') {
        if (!info.desc || !info.messageType) {
          res.end(body);
          return;
        }
        decoded = await pbEngine.decode(info.desc, info.messageType, info.delimited, decompressed);
      } else {
        decoded = JSON.parse(decompressed.toString('utf-8'));
      }

      const original = await cloneData(
        decoded, info.protocol, pbEngine,
        info.desc, info.messageType, info.delimited
      );

      const patched = rules.apply(fullUrl, info.protocol, decoded);

      let encoded: Buffer;
      if (info.protocol === 'protobuf') {
        encoded = await pbEngine.encode(
          info.desc!, info.messageType!, info.delimited, patched
        );
      } else {
        encoded = Buffer.from(JSON.stringify(patched), 'utf-8');
      }

      flowStore.put({
        id: flowId,
        url: `${fullUrl} (request)`,
        method,
        status: null,
        info,
        decoded: patched,
        originalRaw: decompressed,
        reqHeaders,
        direction: 'req',
        ts: Date.now(),
      });

      // Return uncompressed body (whistle pipe handles content-encoding)
      res.end(encoded);
    } catch (e: any) {
      console.error(`[pbmockx] reqRead error ${fullUrl}: ${e.message}`);
      res.end(body);
    }
  });
};
