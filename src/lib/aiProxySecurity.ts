/** Max JSON body size for POST /api/ai (document + prompts). */
export const AI_PROXY_MAX_BODY_BYTES = 1_048_576; // 1 MiB

/** Fixed-window rate limit: max POSTs per IP per window (see middleware). */
export const AI_PROXY_RATE_LIMIT_DEFAULT_MAX = 45;
export const AI_PROXY_RATE_LIMIT_WINDOW_MS = 60_000;

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
