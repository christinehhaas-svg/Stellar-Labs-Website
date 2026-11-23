import assert from "node:assert/strict";
import http from "node:http";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { createPreviewProxy, previewTarget } from "../scripts/lib/browser-preview-proxy.mjs";

test("standalone CI runner refuses to duplicate managed workspace services", () => {
  const result = spawnSync(process.execPath, ["scripts/browser-ci-preview.mjs"], {
    encoding: "utf8",
    env: { ...process.env, CI: "true", REPL_ID: "test-managed-workspace", GITHUB_ACTIONS: "" },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /use the existing review and Canvas workflows/);
});

test("CI preserves review and Canvas mounts, including Vite queries", () => {
  const targets = { review: 1, canvas: 2 };
  for (const url of ["/", "/products/vanilla-vegan-shake", "/review-assets/label.png", "/@vite/client"]) {
    assert.equal(previewTarget(url, targets), 1);
  }
  for (const url of ["/__mockup", "/__mockup/preview/stellar-labs/Homepage", "/__mockup/@vite/client?token=example"]) {
    assert.equal(previewTarget(url, targets), 2);
  }
  assert.equal(previewTarget("/__mockup-other", targets), 1);
});

test("CI proxy forwards paths, query strings, response status, and request bodies", async t => {
  const upstreams = [];
  for (const name of ["review", "canvas"]) {
    const server = http.createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += chunk;
      response.writeHead(201, { "content-type": "application/json" });
      response.end(JSON.stringify({ name, url: request.url, method: request.method, body }));
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    upstreams.push(server);
  }
  const proxy = createPreviewProxy({ review: upstreams[0].address().port, canvas: upstreams[1].address().port });
  await new Promise(resolve => proxy.server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await proxy.close();
    await Promise.all(upstreams.map(server => new Promise(resolve => server.close(resolve))));
  });
  for (const [pathname, name] of [["/products/test?size=1lb", "review"], ["/__mockup/preview/Test?size=2lb", "canvas"]]) {
    const response = await fetch(`http://127.0.0.1:${proxy.server.address().port}${pathname}`, { method: "POST", body: "payload" });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { name, url: pathname, method: "POST", body: "payload" });
  }
});
