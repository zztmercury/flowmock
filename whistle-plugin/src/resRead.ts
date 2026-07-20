/**
 * resRead — pipe hook: response decode → patch → re-encode.
 *
 * Flow: target server → [resRead] → whistle internal → [resWrite] → client
 *
 * In pipe resRead, the response body is passed as the req stream,
 * and response headers are passed as req.headers (not req.originalRes.headers).
 */

import { detect, type DetectInfo } from './content-type';
import { pbEngine, rules, flowStore } from './ctx';
import { readBody, genFlowId, cloneData } from './helpers';
import * as zlib from 'zlib';

export default (server: any, options: any) => {
  server.on('request', async (req: any, res: any) => {
    const fullUrl = req.originalReq?.fullUrl || '';
    // In pipe resRead, response headers are in req.headers
    const resHeaders = req.headers || {};
    const ct = resHeaders['content-type'] || '';
    const encoding = resHeaders['content-encoding'] || '';
    const statusCode = req.originalRes?.statusCode || 200;
    const method = req.originalReq?.method || 'GET';
    const reqHeaders = req.originalReq?.headers || {};

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

    const flowId = genFlowId(fullUrl, Date.now());

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
        encoded = await pbEngine.encode(info.desc!, info.messageType!, info.delimited, patched);
      } else {
        encoded = Buffer.from(JSON.stringify(patched), 'utf-8');
      }

      flowStore.put({
        id: flowId, url: fullUrl, method, status: statusCode, info,
        decoded: patched, originalRaw: decompressed,
        resHeaders, direction: 'res', ts: Date.now(),
      });

      // Return uncompressed body — whistle pipe (方案二) treats it as plaintext,
      // automatically stripping content-encoding so both client and Web UI see raw bytes
      res.end(encoded);

    } catch (e: any) {
      console.error('[pbmockx] resRead error ' + fullUrl + ':', e.message);
      flowStore.put({
        id: flowId, url: fullUrl, method, status: statusCode, info,
        decoded: null, originalRaw: decompressed,
        resHeaders, direction: 'res', error: e.message, ts: Date.now(),
      });
      res.end(body);
    }
  });
};
