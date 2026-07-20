/**
 * FlowStore — LRU store for decoded sessions.
 *
 * Each record contains the decoded message object (or JSON object), the
 * original pre-patch data, protocol info, and patch errors.
 *
 * Replicates Python pbmockx_addon.py flow_store (lines 456-480).
 */

import type { DetectInfo } from './content-type';

export interface FlowRecord {
  id: string;
  url: string;
  method: string;
  status: number | null;
  info: DetectInfo;
  decoded: any;          // decoded message object or JSON object (patched, final)
  originalRaw: Buffer | null;  // original raw bytes (for --original re-decode on demand)
  reqHeaders?: Record<string, string>;
  resHeaders?: Record<string, string>;
  direction?: 'req' | 'res';  // req=reqRead flow, res=resRead flow
  error?: string;
  patchError?: string;
  ts: number;
}

const MAX_FLOWS = 500;

export class FlowStore {
  private store = new Map<string, FlowRecord>();
  private order: string[] = []; // LRU order

  put(rec: FlowRecord): void {
    this.store.set(rec.id, rec);
    this.order.push(rec.id);
    while (this.order.length > MAX_FLOWS) {
      const old = this.order.shift()!;
      this.store.delete(old);
    }
  }

  find(idPrefix: string): FlowRecord | null {
    // Exact match first
    if (this.store.has(idPrefix)) {
      return this.store.get(idPrefix)!;
    }
    // Prefix match
    for (const [k, v] of this.store) {
      if (k.startsWith(idPrefix)) return v;
    }
    return null;
  }

  list(filterRe?: RegExp): FlowRecord[] {
    const items = Array.from(this.store.values()).reverse(); // newest first
    if (filterRe) {
      return items.filter(r => filterRe.test(r.url));
    }
    return items;
  }

  clear(): void {
    this.store.clear();
    this.order = [];
  }

  size(): number {
    return this.store.size;
  }
}
