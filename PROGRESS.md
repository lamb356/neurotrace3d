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

## Weeks 2-3: Core 3D Viewer

- [x] Next.js 16 app shell with Tailwind CSS 4 (App Router, Turbopack)
- [x] TypeScript strict, workspace dep on @neurotrace/swc-parser
- [x] Three.js + R3F + drei integration
- [x] NeuronRenderer: InstancedMesh (nodes) + LineSegments (edges)
- [x] Color-coded by SWC type (soma/axon/basal/apical)
- [x] CameraControls: OrbitControls with damping, auto-fit on load
- [x] ViewerContainer: flex layout with canvas + side panel
- [x] Dynamic import with SSR disabled for Three.js components
- [x] FileUpload: drag-and-drop + click-to-browse (.swc files)
- [x] useNeuronData hook: parseSWC → computeStats → validateSWC pipeline
- [x] StatsPanel: total nodes, length, branch points, tips, by-type counts
- [x] WarningsPanel: collapsible warning list with type/message
- [x] MetadataPanel: species, region, cell type from SWC comments
- [x] Hover highlight (yellow), click select (orange), shift+click multi-select
- [x] Double-click to center camera on node (smooth lerp)
- [x] Escape to clear selection
- [x] NodeInfoPanel: selected node details (ID, type, coords, radius, parent, children)
- [x] useNeuronSelection hook: hover/select/focus state management
- [x] 3 sample SWC files: simple (50), medium (200), large (10K nodes)
- [x] All samples parse with 0 warnings
- [x] pnpm build — production build succeeds
- [x] pnpm typecheck — no TypeScript errors

## Week 4: Polish + Deploy

- [ ] Performance optimization for large morphologies
- [ ] Measurement tools
- [ ] Documentation and deployment
