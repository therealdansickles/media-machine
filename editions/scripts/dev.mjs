import http from "node:http";
import { Readable } from "node:stream";
import { mkdirSync } from "node:fs";
import worker from "../dist/server/index.js";
import { LocalDB } from "./local-db.mjs";
mkdirSync(".local", { recursive: true });
const env = { DB: new LocalDB(".local/editions.db"), IDENTITY_MODE: "sites" };
const argument = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const host = argument("--host") || "127.0.0.1";
const port = Number(argument("--port") || process.env.PORT) || 3000;
http
  .createServer(async (req, res) => {
    try {
      const origin = "http://" + req.headers.host;
      const headers = new Headers();
      for (const [key, val] of Object.entries(req.headers))
        if (typeof val === "string" && !key.startsWith("oai-"))
          headers.set(key, val);
      // Local preview identity only. It is never included in the deployment bundle.
      headers.set("oai-authenticated-user-id", "preview-curator");
      headers.set("oai-authenticated-user-email", "preview@example.org");
      const request = new Request(new URL(req.url, origin), {
        method: req.method,
        headers,
        ...(["POST", "PUT"].includes(req.method)
          ? { body: Readable.toWeb(req), duplex: "half" }
          : {}),
      });
      const response = await worker.fetch(request, env, {
        waitUntil: (p) => p.catch(() => {}),
      });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(500);
      res.end("Preview unavailable.");
    }
  })
  .listen(port, host);
