import { NextRequest } from "next/server";
import { proxyJson } from "../_lib/proxy";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") || "";
  const page = searchParams.get("page") || "0";
  const size = searchParams.get("size") || "20";

  if (q) {
    return proxyJson(`/neuron/select?q=${encodeURIComponent(q)}&page=${page}&size=${size}`);
  }
  return proxyJson(`/neuron?page=${page}&size=${size}`);
}
