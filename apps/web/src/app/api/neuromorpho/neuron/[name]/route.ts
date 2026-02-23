import { proxyJson } from "../../_lib/proxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  return proxyJson(`/neuron/name/${encodeURIComponent(name)}`);
}
