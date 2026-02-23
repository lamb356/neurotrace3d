# NeuroTrace3D Architecture

## Overview
AI-powered web-based 3D neuron morphology viewer, proofreader, and analysis platform. Replaces $15K Neurolucida licenses with a zero-install web app.

## Tech Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Three.js + React Three Fiber (R3F) for 3D rendering
- Zustand for state management with invertible command log (undo/redo)
- pnpm monorepo

## Monorepo Structure
- packages/swc-parser — standalone SWC parser (32 tests, <100ms for 100K nodes)
- apps/web — Next.js web application

## Rendering
- InstancedMesh for soma/node spheres (single draw call for all nodes)
- LineSegments with vertex colors for edges (single draw call)
- Color by SWC type: soma=red, axon=blue, basal dendrite=green, apical=purple

## Data Flow
1. User loads SWC file (drag-drop, sample, or NeuroMorpho.org)
2. SWC parser builds tree (Map-based, O(1) lookup)
3. Zustand store holds nodes + selection + edit history
4. Three.js renders from store data
5. Edits go through invertible commands (undo/redo stack)

## External Integrations
- NeuroMorpho.org API (280K+ neurons, proxied through Next.js API routes)
- Vercel deployment at neurotrace3d.vercel.app
