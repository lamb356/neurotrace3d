# Project: NeuroTrace3D

## Tech Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Three.js + React Three Fiber + Zustand
- pnpm monorepo (apps/web is the main app)
- Deployed on Vercel at neurotrace3d.vercel.app

## Commands
- pnpm dev — start dev server (from apps/web)
- pnpm build — production build
- pnpm typecheck — TypeScript check
- pnpm test — run parser tests

## Key Conventions
- SWC parser is in packages/swc-parser
- Web app is in apps/web
- API routes proxy NeuroMorpho.org (archive names must be lowercased for SWC URLs)
- InstancedMesh for nodes, LineSegments for edges
- Zustand store with invertible command log for undo/redo

## Feature Roadmap
See docs/FEATURE-ROADMAP.md
