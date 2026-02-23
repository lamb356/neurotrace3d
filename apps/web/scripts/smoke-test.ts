import { spawn, execSync } from "node:child_process";
import { createServer } from "node:net";

interface TestResult {
  name: string;
  pass: boolean;
  detail: string;
}

const results: TestResult[] = [];

function findFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.listen(0, () => {
      const port = (srv.address() as { port: number }).port;
      srv.close(() => resolve(port));
    });
  });
}

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function testRoute(
  base: string,
  name: string,
  path: string,
  validate: (res: Response, body: string) => string | null,
): Promise<void> {
  try {
    const res = await fetch(`${base}${path}`);
    const body = await res.text();
    if (!res.ok) {
      results.push({ name, pass: false, detail: `HTTP ${res.status}` });
      return;
    }
    const err = validate(res, body);
    if (err) {
      results.push({ name, pass: false, detail: err });
    } else {
      results.push({ name, pass: true, detail: `HTTP ${res.status} OK` });
    }
  } catch (e) {
    results.push({ name, pass: false, detail: String(e) });
  }
}

async function main() {
  console.log("=== NeuroTrace3D Smoke Test ===\n");

  // Step 1: Build
  console.log("[1/3] Building...");
  try {
    execSync("pnpm build", { stdio: "pipe", cwd: process.cwd() });
    results.push({ name: "Build", pass: true, detail: "next build succeeded" });
    console.log("  Build OK");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    results.push({ name: "Build", pass: false, detail: msg.slice(0, 200) });
    console.error("  Build FAILED");
    printSummary();
    process.exit(1);
  }

  // Step 2: Start server
  const port = await findFreePort();
  const base = `http://localhost:${port}`;
  console.log(`[2/3] Starting server on port ${port}...`);

  const isWindows = process.platform === "win32";
  const server = spawn("npx", ["next", "start", "-p", String(port)], {
    stdio: "pipe",
    cwd: process.cwd(),
    ...(isWindows && { shell: true }),
  });

  try {
    await waitForServer(base);
    console.log("  Server ready\n");

    // Step 3: Run tests
    console.log("[3/3] Running route tests...");

    await testRoute(base, "GET /", "/", (_res, body) => {
      if (!body.includes("NeuroTrace")) return "Missing 'NeuroTrace' in response";
      return null;
    });

    await testRoute(base, "GET /viewer", "/viewer", (_res, body) => {
      if (!body.includes("NeuroTrace")) return "Missing 'NeuroTrace' in response";
      return null;
    });

    await testRoute(
      base,
      "GET /api/neuromorpho/fields/species",
      "/api/neuromorpho/fields/species",
      (_res, body) => {
        try {
          const data = JSON.parse(body);
          if (!data.fields || !Array.isArray(data.fields)) return "Expected { fields: [...] }";
          return null;
        } catch {
          return "Invalid JSON";
        }
      },
    );

    await testRoute(
      base,
      "GET /api/neuromorpho/search",
      "/api/neuromorpho/search?size=1",
      (_res, body) => {
        try {
          const data = JSON.parse(body);
          if (!data._embedded && !data.page) return "Unexpected response shape";
          return null;
        } catch {
          return "Invalid JSON";
        }
      },
    );

    await testRoute(
      base,
      "GET /api/neuromorpho/neuron/cnic_001",
      "/api/neuromorpho/neuron/cnic_001",
      (_res, body) => {
        try {
          const data = JSON.parse(body);
          if (!data.neuron_name) return "Missing neuron_name";
          return null;
        } catch {
          return "Invalid JSON";
        }
      },
    );

    await testRoute(
      base,
      "GET /api/neuromorpho/swc/cnic_001",
      "/api/neuromorpho/swc/cnic_001",
      (_res, body) => {
        if (!body.includes("1 1") && !body.includes("# ")) return "SWC data not recognized";
        return null;
      },
    );
  } finally {
    server.kill("SIGTERM");
  }

  printSummary();
  const failed = results.filter((r) => !r.pass).length;
  process.exit(failed > 0 ? 1 : 0);
}

function printSummary() {
  console.log("\n=== Results ===\n");
  for (const r of results) {
    const icon = r.pass ? "PASS" : "FAIL";
    console.log(`  [${icon}] ${r.name} — ${r.detail}`);
  }
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n  ${passed} passed, ${failed} failed\n`);
}

main().catch((e) => {
  console.error("Smoke test crashed:", e);
  process.exit(1);
});
