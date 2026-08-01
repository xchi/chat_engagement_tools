/** Query-param helpers shared by the mock API route handlers (T5). */

/**
 * Parse a non-negative numeric query param. Absent or empty → `fallback`;
 * anything else non-numeric or negative → `null` (caller answers 400).
 */
export function parseNonNegative(
  params: URLSearchParams,
  name: string,
  fallback: number,
): number | null {
  const raw = params.get(name);
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}
