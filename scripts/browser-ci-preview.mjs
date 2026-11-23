import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createPreviewProxy } from "./lib/browser-preview-proxy.mjs";

// Never create duplicate servers alongside Replit's managed workflows.
if (!process.env.CI || (process.env.REPL_ID && !process.env.GITHUB_ACTIONS)) {
  throw new Error("Standalone previews are for CI only. In Replit, use the existing review and Canvas workflows.");
}
const root = path.resolve(import.meta.dirname, "..");
const servers = [];
let proxy;
let closing = false;
async function close(exitCode = 0) {
  if (closing) return;
  closing = true;
  await proxy?.close();
  await Promise.all(servers.map(server => server.close()));
  process.exitCode = exitCode;
}
process.once("SIGTERM", () => void close());
process.once("SIGINT", () => void close());

try {
  // Preparation touches shared vendored assets: finish it before starting either
  // service. No database, API credentials, or development URL is required.
  execFileSync(process.execPath, ["artifacts/stellar-review/scripts/prepare-assets.mjs"], {
    cwd: root, env: { ...process.env, BASE_PATH: "/" }, stdio: "inherit",
  });
  const specs = [
    { dir: "stellar-review", port: 18101, base: "/" },
    { dir: "mockup-sandbox", port: 18102, base: "/__mockup/" },
  ];
  for (const spec of specs) {
    process.env.PORT = String(spec.port);
    process.env.BASE_PATH = spec.base;
    const directory = path.join(root, "artifacts", spec.dir);
    const require = createRequire(path.join(directory, "package.json"));
    const { createServer } = await import(pathToFileURL(require.resolve("vite")).href);
    const server = await createServer({
      configFile: path.join(directory, "vite.config.ts"),
      server: { host: "127.0.0.1", port: spec.port, strictPort: true },
    });
    servers.push(server);
    await server.listen();
  }
  proxy = createPreviewProxy({ review: 18101, canvas: 18102 });
  await new Promise((resolve, reject) => {
    proxy.server.once("error", reject);
    proxy.server.listen(18080, "127.0.0.1", resolve);
  });
  console.log("Browser CI previews ready: http://127.0.0.1:18080");
} catch (error) {
  console.error(error);
  await close(1);
}
