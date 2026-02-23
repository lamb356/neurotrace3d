import { NextRequest } from "next/server";
import { proxyJson } from "../_lib/proxy";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") || "";
  const fq = searchParams.getAll("fq");
  const page = searchParams.get("page") || "0";
  const size = searchParams.get("size") || "20";

  if (q || fq.length > 0) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    for (const f of fq) params.append("fq", f);
    params.set("page", page);
    params.set("size", size);
    return proxyJson(`/neuron/select?${params}`);
  }
  return proxyJson(`/neuron?page=${page}&size=${size}`);
}
