import { proxyFetch } from "../../_lib/proxy";

const SWC_BASE = "https://neuromorpho.org";
const TIMEOUT_MS = 10000;

async function fetchSWC(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (res.ok) return res;
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  // Step 1: get neuron metadata to find the archive name
  const metaRes = await proxyFetch(`/neuron/name/${encodeURIComponent(name)}`);
  if (!metaRes.ok) {
    return Response.json(
      { error: "Failed to fetch neuron metadata" },
      { status: metaRes.status },
    );
  }

  const neuron = await metaRes.json();
  const archive: string = neuron.archive;
  if (!archive) {
    return Response.json(
      { error: "Neuron has no archive field" },
      { status: 404 },
    );
  }

  // Step 2: try CNG (standardized) version first
  const cngUrl = `${SWC_BASE}/dableFiles/${encodeURIComponent(archive)}/CNG%20version/${encodeURIComponent(name)}.CNG.swc`;
  let swcRes = await fetchSWC(cngUrl);

  // Step 3: fallback to original version
  if (!swcRes) {
    const origUrl = `${SWC_BASE}/dableFiles/${encodeURIComponent(archive)}/Source-Version/${encodeURIComponent(name)}.swc`;
    swcRes = await fetchSWC(origUrl);
  }

  if (!swcRes) {
    return Response.json(
      { error: "SWC file not found" },
      { status: 404 },
    );
  }

  const text = await swcRes.text();
  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
