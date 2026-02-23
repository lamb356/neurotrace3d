# Features 12, 13, 14 — Ortho Views, Minimap, Keyboard Nav

## Feature 14: Keyboard Navigation
- [x] `store/types.ts` — add navCursor, navigateTo, setNavCursor
- [x] `store/useNeuronStore.ts` — add initial state + actions + resets
- [x] `lib/colors.ts` — add NAV_CURSOR_COLOR
- [x] `NeuronRenderer.tsx` — subscribe to navCursor, add cyan highlight
- [x] `page.tsx` — add arrow key handlers + clear navCursor on Escape
- [x] Typecheck + build → commit 79e2e77

## Feature 12: Orthographic Views
- [x] `store/types.ts` — add cameraMode, setCameraMode
- [x] `store/useNeuronStore.ts` — add initial state + action + reset
- [x] `CameraControls.tsx` — dual cameras, ortho frustum, axis snap, disable rotation
- [x] `NeuronCanvas.tsx` — remove camera prop
- [x] `Toolbar.tsx` — add 3D/XY/XZ/YZ buttons
- [x] `page.tsx` — add 1/2/3/4 shortcuts
- [x] Typecheck + build → commit 8e4d40d

## Feature 13: Minimap
- [x] `lib/mainCameraRef.ts` — create shared camera ref
- [x] `store/types.ts` — add showMinimap, setShowMinimap
- [x] `store/useNeuronStore.ts` — add initial state + action
- [x] `CameraControls.tsx` — set mainCameraRef, dispatch main-camera-moved
- [x] `Minimap.tsx` — create full component
- [x] `page.tsx` — render Minimap alongside NeuronCanvas
- [x] `Toolbar.tsx` — add Minimap toggle
- [x] Typecheck + build → commit da01b90

## Finalize
- [x] `docs/FEATURE-ROADMAP.md` — mark 12-14 done
- [ ] Push
