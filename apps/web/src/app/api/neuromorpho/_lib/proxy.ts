const API_BASE = "https://neuromorpho.org/api";
const TIMEOUT_MS = 5000;

export async function proxyFetch(path: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`NeuroMorpho API returned ${res.status}`);
    }
    return res;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return Response.json(
        { error: "NeuroMorpho.org timed out" },
        { status: 504 },
      );
    }
    if (err instanceof TypeError) {
      // Network error (DNS failure, connection refused, etc.)
      return Response.json(
        { error: "NeuroMorpho.org unreachable" },
        { status: 502 },
      );
    }
    return Response.json(
      { error: (err as Error).message || "NeuroMorpho.org request failed" },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function proxyJson(path: string): Promise<Response> {
  const upstream = await proxyFetch(path);
  if (!upstream.ok) return upstream;
  const data = await upstream.json();
  return Response.json(data);
}
