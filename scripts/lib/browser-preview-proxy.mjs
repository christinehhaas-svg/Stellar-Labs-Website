import http from "node:http";
import net from "node:net";

/** Preserve the same two path mounts as the managed preview router. */
export function previewTarget(url, targets) {
  const pathname = new URL(url, "http://localhost").pathname;
  return pathname === "/__mockup" || pathname.startsWith("/__mockup/")
    ? targets.canvas : targets.review;
}

export function createPreviewProxy(targets) {
  const sockets = new Set();
  const server = http.createServer((request, response) => {
    const target = previewTarget(request.url, targets);
    const upstream = http.request({
      hostname: "127.0.0.1", port: target,
      method: request.method, path: request.url, headers: request.headers,
    }, incoming => {
      response.writeHead(incoming.statusCode, incoming.headers);
      incoming.pipe(response);
    });
    upstream.on("error", error => {
      if (!response.headersSent) response.writeHead(502, { "content-type": "text/plain" });
      response.end(`Preview service unavailable: ${error.code ?? "request failed"}`);
    });
    request.on("aborted", () => upstream.destroy());
    request.pipe(upstream);
  });
  server.on("connection", socket => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  server.on("upgrade", (request, socket, head) => {
    const upstream = net.connect(previewTarget(request.url, targets), "127.0.0.1");
    sockets.add(upstream);
    upstream.on("close", () => sockets.delete(upstream));
    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
    upstream.once("connect", () => {
      const headers = Object.entries(request.headers)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`).join("\r\n");
      upstream.write(`${request.method} ${request.url} HTTP/1.1\r\n${headers}\r\n\r\n`);
      if (head.length) upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
    socket.on("close", () => upstream.destroy());
  });
  return {
    server,
    close: () => {
      for (const socket of sockets) socket.destroy();
      return new Promise(resolve => server.close(resolve));
    },
  };
}
