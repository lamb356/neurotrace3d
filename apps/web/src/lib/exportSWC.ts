import { serializeSWC } from "@neurotrace/swc-parser";
import { toParseResult } from "@/store/derived";
import type { NeuronState } from "@/store/types";

export function exportSWC(state: NeuronState): void {
  const result = toParseResult(state);
  const content = serializeSWC(result);
  const name =
    state.fileName?.replace(/\.swc$/i, "_edited.swc") ?? "neuron_edited.swc";
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
