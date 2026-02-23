# NeuroTrace3D — Progress

## Phase 1: Monorepo + SWC Parser + Core Viewer (Complete)

### Week 1: Monorepo + SWC Parser

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

### Weeks 2-3: Core 3D Viewer

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

## Phase 2: Editing & Proofreading (Complete)

### Step 1: Zustand Store Migration (Commit 9)

- [x] Install zustand + immer
- [x] Create store/types.ts — NeuronState, NeuronActions interfaces
- [x] Create store/derived.ts — recomputeDerived(), toParseResult() helpers
- [x] Create store/useNeuronStore.ts — Zustand store with Immer middleware, enableMapSet()
- [x] Migrate all 9 components from props to store selectors (zero prop drilling)
- [x] NeuronCanvas: 8 props → 0 props
- [x] focusTarget as plain {x,y,z} object in store (not Three.js Vector3)
- [x] Delete useNeuronData.ts and useNeuronSelection.ts hooks
- [x] pnpm typecheck — clean
- [x] pnpm build — succeeds

### Step 2: Undo/Redo System (Commit 10)

- [x] Create store/operations.ts — TreeOp type, applyOpsToTree(), invertOps()
- [x] TreeOp types: MOVE, DELETE, INSERT, RETYPE, RESIZE, REPARENT
- [x] invertOps: reverses array, swaps before/after, flips INSERT↔DELETE
- [x] Add history/future stacks to store (capped at 100)
- [x] applyOps: apply ops, push to history, clear future, recomputeDerived
- [x] undo: pop history, invert ops, apply, push to future
- [x] redo: pop future, apply, push to history
- [x] Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts
- [x] History cleared on file load
- [x] pnpm typecheck — clean

### Step 3: Node Edit Operations (Commit 11)

- [x] Create store/editActions.ts — operation creators
- [x] moveNode: MOVE op with before/after xyz
- [x] deleteNodes: DELETE ops + REPARENT children, depth-sorted (leaves first)
- [x] insertNode: INSERT new node + REPARENT child, auto-generated ID
- [x] retypeNodes: RETYPE ops with before/after type
- [x] reparentNode: REPARENT op with cycle detection
- [x] selectSubtree: BFS via childIndex to select all descendants
- [x] Create NodeDragger.tsx — R3F drag-to-move via pointer capture
- [x] Delete key deletes selected nodes
- [x] All ops grouped as single applyOps call (single undo step)
- [x] pnpm typecheck — clean

### Step 4: Toolbar + Context Menu + Export (Commit 12)

- [x] Create Toolbar.tsx — tool buttons, undo/redo, export, node/selection counts
- [x] Tool buttons: Select (V), Move (M), Insert (I), Delete (X)
- [x] Active tool highlighted with accent color
- [x] Undo/Redo buttons with disabled state
- [x] Create RetypeDropdown.tsx — all 8 SWC types with color indicators
- [x] Create ContextMenu.tsx — right-click menu with Retype, Delete, Select subtree, Center camera
- [x] Context menu via CustomEvent from R3F to HTML overlay
- [x] Create exportSWC.ts — serializeSWC() → Blob → download link
- [x] Tool keyboard shortcuts: V/M/I/X (no modifier keys)
- [x] Delete tool mode: click node to delete immediately
- [x] ViewerContainer: toolbar slot above canvas
- [x] activeTool state in store with setActiveTool action
- [x] NodeDragger active only when Move tool selected
- [x] pnpm typecheck — clean
- [x] pnpm build — succeeds

## Phase 3: NeuroMorpho.org Integration (Complete)

### Step 1: API Proxy Routes (Commit 13)

- [x] Create shared proxy helper with 5s timeout, AbortError→504, network→502
- [x] Search/browse route: GET /api/neuromorpho/search with q, fq, page, size params
- [x] Single neuron route: GET /api/neuromorpho/neuron/[name]
- [x] SWC download route: GET /api/neuromorpho/swc/[name] with CNG→Source fallback
- [x] Filter fields route: GET /api/neuromorpho/fields/[field]
- [x] Shared TypeScript types: NeuromorphoNeuron, NeuromorphoPage, NeuromorphoSearchResult
- [x] pnpm typecheck — clean
- [x] pnpm build — succeeds

### Step 2: NeuromorphoBrowser Component (Commit 14)

- [x] NeuromorphoBrowser with text search, filter dropdowns, paginated results
- [x] Filter options (species, brain_region, cell_type) fetched on mount
- [x] Proper NeuroMorpho Solr query syntax: q + fq parameter separation
- [x] NeuronCard with neuron name, species/region/cell_type, Load button
- [x] Loading spinner on individual cards during SWC fetch
- [x] Pagination with prev/next, page count, total results
- [x] pnpm typecheck — clean

### Step 3: Store Integration + Sidebar Tabs (Commit 15)

- [x] Add loadFromNeuromorpho action to Zustand store
- [x] Track source ("local" | "neuromorpho") and neuromorphoMeta in state
- [x] loadSWC/loadFile set source to "local", clear neuromorphoMeta
- [x] Sidebar tab toggle: File Upload | NeuroMorpho
- [x] MetadataPanel shows archive, scientific name, stain, physical integrity for NeuroMorpho neurons
- [x] pnpm typecheck — clean
- [x] pnpm build — succeeds

### Step 4: Featured Neurons + Landing Polish (Commit 16)

- [x] 6 curated featured neurons: rat pyramidal, mouse Purkinje, human interneuron, retinal ganglion, drosophila motor, rat cortical
- [x] All neuron names verified against NeuroMorpho.org API
- [x] FeaturedNeurons grid component (2-col on desktop) with loading states
- [x] Landing page: file upload → samples → featured neurons flow
- [x] pnpm typecheck — clean
- [x] pnpm build — succeeds
