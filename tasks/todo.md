# Multi-Format Import — SWC-JSON, Neurolucida ASC, Unified Parser

## Feature 1: SWC-JSON Parser
- [ ] Create `lib/parsers/swcJson.ts` — JSON node-array parser with field normalization
- [ ] Typecheck → commit

## Feature 2: Neurolucida ASC Parser
- [ ] Create `lib/parsers/neurolucidaAsc.ts` — tokenizer + recursive descent parser
- [ ] Typecheck → commit

## Feature 3: Unified Parser + Integration
- [ ] Create `lib/parsers/index.ts` — parseNeuronFile + isSupportedFile
- [ ] Update `useNeuronStore.ts` — use parseNeuronFile instead of parseSWC
- [ ] Update `useBatchAnalysis.ts` — use parseNeuronFile instead of parseSWC
- [ ] Update `FileUpload.tsx` — accept .swc,.asc,.json + updated labels
- [ ] Update `BatchDropZone.tsx` — accept .swc,.asc,.json + updated labels
- [ ] Typecheck + build → commit

## Finalize
- [ ] Push
