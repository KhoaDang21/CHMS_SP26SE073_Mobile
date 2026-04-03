/**
 * Normalize BE shapes: ApiResponse<T>, PagedResult, PascalCase — aligned with FE services.
 */

export function extractArray<T = unknown>(res: unknown): T[] {
  if (res == null || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  const d = r.data;
  if (Array.isArray(d)) return d as T[];
  if (d && typeof d === "object" && !Array.isArray(d)) {
    const inner = d as Record<string, unknown>;
    if (Array.isArray(inner.items)) return inner.items as T[];
    if (Array.isArray(inner.Items)) return inner.Items as T[];
  }
  if (Array.isArray(r.items)) return r.items as T[];
  if (Array.isArray(r.Items)) return r.Items as T[];
  if (Array.isArray(res)) return res as T[];
  return [];
}

export function extractPagedItems(res: unknown): unknown[] {
  if (res == null || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  const outer = r.data !== undefined ? r.data : r;
  if (Array.isArray(outer)) return outer;
  if (outer == null || typeof outer !== "object") return [];
  const paged = outer as Record<string, unknown>;
  const items = paged.items ?? paged.Items;
  return Array.isArray(items) ? items : [];
}

export function extractObject(res: unknown): Record<string, unknown> | null {
  if (res == null || typeof res !== "object") return null;
  const r = res as Record<string, unknown>;
  const d = r.data;
  if (d && typeof d === "object" && !Array.isArray(d)) return d as Record<string, unknown>;
  return r;
}
