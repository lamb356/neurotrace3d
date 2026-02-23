# Visual & UX Overhaul

## Phase 1: Rendering Overhaul
- [x] Install `@react-three/postprocessing` + `postprocessing`
- [x] `globals.css` — update dark theme CSS vars + add `.numeric` class
- [x] `lib/colors.ts` — update TYPE_COLORS + DEFAULT_COLOR (desaturated palette)
- [x] `NeuronRenderer.tsx` — instanced cylinders, taper shader, sphere upgrade (16x12), junction radius matching, shared MeshPhysicalMaterial, LOD system
- [x] `NeuronCanvas.tsx` — new lighting (ambient + 2x directional + hemisphere), fog, post-processing (SSAO/Bloom/SMAA), disable antialias
- [x] Typecheck + build → zero errors

## Phase 2: UI Professional Polish
- [x] `lib/morphometrics.ts` — getBranchOrder, getPathToSoma
- [x] `StatusBar.tsx` — 24px footer with node/segment/selection counts + hover info
- [x] `NodeInfoPanel.tsx` — scientific panel with type badge, position, topology, morphometrics
- [x] `NeuronCanvas.tsx` — tool cursors + GhostNode mount
- [x] `GhostNode.tsx` — translucent cyan mouse-follow sphere for insert/extend
- [x] `Toolbar.tsx` — vertical 48px icon rail with tooltips
- [x] `ViewerContainer.tsx` — new layout (vertical toolbar + status bar + canvas)
- [x] `MeasurementOverlay.tsx` — upgraded colors (#ffd700), navy theme labels
- [x] `ScaleBar.tsx` — ortho-mode scale bar with auto-snap values
- [x] Applied `.numeric` class across MeasurementsPanel, StatsPanel, NodeInfoPanel, StatusBar
- [x] Typecheck + build → zero errors

## Finalize
- [ ] Commit
- [ ] Push
