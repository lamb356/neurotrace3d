# NeuroTrace3D — Phase 1 Progress

## Week 1: Monorepo + SWC Parser

- [x] Scaffold Turborepo monorepo with pnpm workspaces
- [x] Root config: turbo.json, tsconfig.json, pnpm-workspace.yaml
- [x] Stub packages: neuron-tree, web
- [x] @neurotrace/swc-parser package setup (tsup, vitest, dual ESM/CJS)
- [x] types.ts — SWCNode, SWCParseResult, ParseWarning, MorphologyStats, SWC_TYPE
- [x] utils.ts — normalizeContent, normalizeLine, extractMetadata
- [x] parser.ts — parseSWC() with 11 edge-case handling
- [x] serializer.ts — serializeSWC() with comment preservation
- [x] validator.ts — validateSWC() with cycle + disconnected component detection
- [x] subtree.ts — getSubtree() with BFS extraction
- [x] stats.ts — computeStats() with iterative DFS
- [x] index.ts — barrel re-exports
- [x] 32 tests passing (7 test files)
- [x] 11 edge-case tests
- [x] Round-trip serialization test
- [x] 100K node performance test (<200ms)
- [x] Realistic 200-node pyramidal neuron fixture
- [x] pnpm build — dual ESM/CJS output with type declarations
- [x] pnpm typecheck — no TypeScript errors
- [x] pnpm test — all 32 tests pass

## Week 2: Neuron Tree + Viewer Shell

- [ ] @neurotrace/neuron-tree package
- [ ] NeuronTree class with spatial indexing
- [ ] Web app shell with React + Three.js
- [ ] Basic 3D line rendering of SWC morphologies
- [ ] Camera controls and viewport setup

## Week 3: Interactive Editing

- [ ] Node selection and highlighting
- [ ] Edit operations (add, delete, move nodes)
- [ ] Undo/redo system
- [ ] File import/export UI

## Week 4: Polish + Deploy

- [ ] Performance optimization for large morphologies
- [ ] Color coding by neurite type
- [ ] Measurement tools
- [ ] Documentation and deployment
