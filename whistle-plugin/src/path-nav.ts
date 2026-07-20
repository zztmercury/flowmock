/**
 * JSON path navigation — parse "a.b[0].c" into segments, then get/set.
 *
 * Works on both protobufjs message objects and plain JS objects because
 * protobufjs message fields are accessible via normal property access.
 */

const PATH_SEG_RE = /([^\[\].]+)|\[(\d+)\]/g;

export type PathSegment = string | number;

export function parsePath(path: string): PathSegment[] {
  const parts: PathSegment[] = [];
  let m: RegExpExecArray | null;
  PATH_SEG_RE.lastIndex = 0;
  while ((m = PATH_SEG_RE.exec(path)) !== null) {
    if (m[1] !== undefined) parts.push(m[1]);
    else if (m[2] !== undefined) parts.push(parseInt(m[2], 10));
  }
  return parts;
}

export function getByPath(obj: any, parts: PathSegment[]): any {
  let cur = obj;
  for (const p of parts) cur = cur[p];
  return cur;
}

export function setByPath(obj: any, parts: PathSegment[], value: any): void {
  if (parts.length === 0) return;
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = value;
}

/** Check whether a path exists in the object. */
export function hasPath(obj: any, parts: PathSegment[]): boolean {
  try {
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return false;
      cur = cur[p];
    }
    return true;
  } catch {
    return false;
  }
}
