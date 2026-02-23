const API_BASE = "https://neuromorpho.org/api";
const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

export async function proxyFetch(path: string): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timer);
      // Return the response as-is — let callers decide how to handle non-ok
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err as Error;

      if (err instanceof DOMException && err.name === "AbortError") {
        // Timeout — retry if attempts remain
        if (attempt < MAX_RETRIES) continue;
        return Response.json(
          { error: "NeuroMorpho.org timed out" },
          { status: 504 },
        );
      }
      if (err instanceof TypeError) {
        // Network error — retry if attempts remain
        if (attempt < MAX_RETRIES) continue;
        return Response.json(
          { error: "NeuroMorpho.org unreachable" },
          { status: 502 },
        );
      }
      // Unknown error — don't retry
      break;
    }
  }

  return Response.json(
    { error: lastError?.message || "NeuroMorpho.org request failed" },
    { status: 502 },
  );
}

export async function proxyJson(path: string): Promise<Response> {
  const upstream = await proxyFetch(path);
  if (!upstream.ok) {
    // Forward the upstream status + a useful error message
    return Response.json(
      { error: `NeuroMorpho API returned ${upstream.status}` },
      { status: upstream.status },
    );
  }
  const data = await upstream.json();
  return Response.json(data);
}
