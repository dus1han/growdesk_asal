import type { ConfigBundle } from '../types/growdesk';

/** True when version `a` is newer than `b` ("1.0.10" > "1.0.9"). Missing parts count as 0. */
export function isNewerVersion(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

/** GrowDesk offers a newer toolbar than `current`: capturing stays blocked until it is installed. */
export function updateRequired(bundle: ConfigBundle | null | undefined, current: string): boolean {
  return Boolean(bundle?.latest && isNewerVersion(bundle.latest.version, current));
}
