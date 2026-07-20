/**
 * DescCache — download FileDescriptorSet (.desc binary) with HTTP 1.1
 * conditional request caching (ETag / Last-Modified).
 *
 * Replicates Python pbmockx_addon.py DescCache (lines 79-116).
 */

import * as http from 'http';
import * as https from 'https';

interface CacheEntry {
  etag?: string;
  lastModified?: string;
  bytes: Buffer;
  ts: number;
}

export class DescCache {
  private cache = new Map<string, CacheEntry>();

  async get(url: string): Promise<Buffer> {
    const entry = this.cache.get(url);
    const headers: Record<string, string> = {};
    if (entry) {
      if (entry.etag) headers['If-None-Match'] = entry.etag;
      if (entry.lastModified) headers['If-Modified-Since'] = entry.lastModified;
    }

    try {
      const res = await this._fetch(url, headers);
      if (res.statusCode === 304 && entry) {
        entry.ts = Date.now();
        return entry.bytes;
      }
      if (res.statusCode !== 200) {
        if (entry) return entry.bytes;
        throw new Error(`desc ${url} HTTP ${res.statusCode}`);
      }
      const data = await this._readBody(res);
      this.cache.set(url, {
        etag: res.headers.etag as string | undefined,
        lastModified: res.headers['last-modified'] as string | undefined,
        bytes: data,
        ts: Date.now(),
      });
      return data;
    } catch (e: any) {
      if (e.code === '304' && entry) return entry.bytes;
      if (entry) return entry.bytes;
      throw e;
    }
  }

  private _fetch(url: string, headers: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? https : http;
      const req = mod.request(url, { method: 'GET', headers, timeout: 10000 }, resolve);
      req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.end();
    });
  }

  private _readBody(res: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
  }
}
