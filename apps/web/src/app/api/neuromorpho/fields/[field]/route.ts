import { proxyJson } from "../../_lib/proxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ field: string }> },
) {
  const { field } = await params;
  return proxyJson(`/neuron/fields/${encodeURIComponent(field)}`);
}
