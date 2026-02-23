# Features 7 & 8 — Box Selection + Path Selection

## Feature 7: Box Selection Tool
- [ ] Extend `activeTool` union in types.ts with "box-select" | "path-select"
- [ ] Add Box and Path tools to Toolbar.tsx TOOLS array
- [ ] Add B and P keyboard shortcuts in page.tsx
- [ ] Create BoxSelector.tsx (drag behavior + rectangle overlay portal)
- [ ] Mount BoxSelector in NeuronCanvas.tsx
- [ ] Typecheck + build
- [ ] Commit

## Feature 8: Path Selection Tool
- [ ] Add `findPath()` to lib/measurements.ts (BFS returning node ID array)
- [ ] Add `addPathSelectPending` action to useNeuronStore.ts
- [ ] Add path-select dispatch in NeuronRenderer.tsx handleClick
- [ ] Typecheck + build
- [ ] Commit

## Wrap-up
- [ ] Update FEATURE-ROADMAP.md — mark 7 and 8 done
- [ ] Push
