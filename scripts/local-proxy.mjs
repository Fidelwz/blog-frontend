import { createServer, request } from "node:http";
import { connect } from "node:net";

const port = Number(process.env.BLOG_DEMO_PORT ?? "3100");
const webPort = Number(process.env.BLOG_WEB_PORT ?? "3101");
const apiPort = Number(process.env.BLOG_API_PORT ?? "3200");
const host = "127.0.0.1";

const proxy = createServer((incoming, outgoing) => {
  const upstream = request({
    host, port: webPort, path: incoming.url, method: incoming.method, headers: incoming.headers,
  }, response => {
    outgoing.writeHead(response.statusCode, response.headers);
    response.pipe(outgoing);
  });
  upstream.on("error", () => {
    if (!outgoing.headersSent) outgoing.writeHead(503);
    outgoing.end("El frontend local no está disponible.");
  });
  incoming.on("aborted", () => upstream.destroy());
  incoming.pipe(upstream);
});

proxy.on("upgrade", (incoming, socket, head) => {
  const pathname = new URL(incoming.url, "http://localhost").pathname;
  // Nest validates origin, session and room permissions. Next handles HMR upgrades.
  const upstream = connect(pathname === "/tiempo-real" ? apiPort : webPort, host, () => {
    const lines = [`${incoming.method} ${incoming.url} HTTP/${incoming.httpVersion}`];
    for (let i = 0; i < incoming.rawHeaders.length; i += 2) {
      lines.push(`${incoming.rawHeaders[i]}: ${incoming.rawHeaders[i + 1]}`);
    }
    upstream.write(lines.join("\r\n") + "\r\n\r\n");
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
  socket.on("close", () => upstream.destroy());
});

proxy.listen(port, host, () => console.log(`Blog local en http://127.0.0.1:${port}`));
