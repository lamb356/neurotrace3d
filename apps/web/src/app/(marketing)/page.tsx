import Link from "next/link";

const FEATURES = [
  {
    title: "SWC File Support",
    description: "Load and parse standard SWC morphology files with full type support for soma, axon, basal, and apical dendrites.",
  },
  {
    title: "Interactive 3D Rendering",
    description: "Explore neuron morphologies in a GPU-accelerated 3D viewport with orbit, pan, and zoom controls.",
  },
  {
    title: "Selection Tools",
    description: "Click, box-select, or path-select nodes. Shift-click to extend selection. Right-click context menu for quick actions.",
  },
  {
    title: "Measurement & Sholl Analysis",
    description: "Measure distances and branch angles. Run Sholl analysis with concentric spheres and intersection charts.",
  },
  {
    title: "Tree Editing",
    description: "Split branches, prune subtrees, extend dendrites, move nodes, insert points, and retype segments with full undo/redo.",
  },
  {
    title: "Keyboard Navigation",
    description: "Walk the tree structure with arrow keys. Shift extends selection. Cyan cursor highlights your position.",
  },
  {
    title: "Orthographic Views",
    description: "Switch between perspective and axis-aligned XY, XZ, YZ orthographic projections with smooth camera transitions.",
  },
  {
    title: "Minimap Overview",
    description: "Toggle a picture-in-picture minimap showing the full neuron with a frustum indicator for spatial context.",
  },
  {
    title: "NeuroMorpho.org Browser",
    description: "Search and load neurons directly from the NeuroMorpho.org database with 280,000+ reconstructions.",
  },
  {
    title: "Batch Analysis",
    description: "Drop multiple SWC files to compute morphometrics across all neurons. Export results as CSV or XLSX.",
  },
  {
    title: "Dendrogram & Morphometrics",
    description: "Topological dendrogram view, Strahler order, branch angles, tortuosity, convex hull volume, and fractal dimension.",
  },
];

const COMPARISONS = [
  { feature: "Price", us: "Free & open source", them: "Commercial license" },
  { feature: "Platform", us: "Any web browser", them: "Windows desktop only" },
  { feature: "Installation", us: "None — just open the URL", them: "Download + install" },
  { feature: "SWC editing", us: "Split, prune, extend, move, retype", them: "Full editor suite" },
  { feature: "Sholl analysis", us: "Built-in with export", them: "Built-in" },
  { feature: "NeuroMorpho.org", us: "Integrated browser", them: "Manual download" },
  { feature: "Batch analysis", us: "Built-in with CSV/XLSX export", them: "Separate module" },
  { feature: "Collaboration", us: "Coming soon (CRDT)", them: "Not available" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-6 px-6 py-24 text-center md:py-32">
        <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
          NeuroTrace<span className="text-accent">3D</span>
        </h1>
        <p className="text-text-muted max-w-2xl text-lg md:text-xl">
          A free, open-source 3D neuron morphology viewer and editor.
          Load SWC files, explore reconstructions, run Sholl analysis, and edit
          tree structures — all in your browser.
        </p>
        <div className="flex gap-4">
          <Link
            href="/viewer"
            className="bg-accent hover:bg-accent-hover rounded-lg px-6 py-3 font-semibold text-white transition-colors"
          >
            Open Viewer
          </Link>
          <Link
            href="/batch"
            className="border-border hover:bg-surface-hover rounded-lg border px-6 py-3 font-semibold transition-colors"
          >
            Batch Analysis
          </Link>
          <a
            href="https://github.com/lamb356/neurotrace3d"
            target="_blank"
            rel="noopener noreferrer"
            className="border-border hover:bg-surface-hover rounded-lg border px-6 py-3 font-semibold transition-colors"
          >
            GitHub
          </a>
        </div>
      </section>

      {/* Demo placeholder */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="bg-surface border-border flex aspect-video items-center justify-center rounded-xl border">
          <div className="text-center">
            <p className="text-text-muted text-lg">3D Neuron Viewer</p>
            <p className="text-text-muted mt-1 text-sm">
              <Link href="/viewer" className="text-accent hover:text-accent-hover underline">
                Open the viewer
              </Link>
              {" "}to explore neuron morphologies
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">Features</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-surface border-border rounded-xl border p-6 transition-colors hover:border-accent/40"
            >
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="mb-4 text-center text-3xl font-bold">Why NeuroTrace3D?</h2>
        <p className="text-text-muted mb-12 text-center">
          See how we compare to traditional desktop tools like Neurolucida.
        </p>
        <div className="bg-surface border-border overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b">
                <th className="px-6 py-3 text-left font-semibold">Feature</th>
                <th className="text-accent px-6 py-3 text-left font-semibold">NeuroTrace3D</th>
                <th className="text-text-muted px-6 py-3 text-left font-semibold">Neurolucida</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISONS.map((row) => (
                <tr key={row.feature} className="border-border border-b last:border-0">
                  <td className="px-6 py-3 font-medium">{row.feature}</td>
                  <td className="px-6 py-3">{row.us}</td>
                  <td className="text-text-muted px-6 py-3">{row.them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-6 px-6 py-20 text-center">
        <h2 className="text-3xl font-bold">Ready to explore?</h2>
        <p className="text-text-muted max-w-lg">
          Load your own SWC files or browse 280,000+ reconstructions from NeuroMorpho.org.
        </p>
        <Link
          href="/viewer"
          className="bg-accent hover:bg-accent-hover rounded-lg px-8 py-3 font-semibold text-white transition-colors"
        >
          Open Viewer
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-border text-text-muted border-t px-6 py-8 text-center text-sm">
        <p>
          Built with Next.js + Three.js.{" "}
          <a
            href="https://github.com/lamb356/neurotrace3d"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover underline"
          >
            View on GitHub
          </a>
        </p>
      </footer>
    </main>
  );
}
