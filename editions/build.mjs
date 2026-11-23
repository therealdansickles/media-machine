import { build } from "esbuild";
import { cp, mkdir } from "node:fs/promises";
await mkdir("dist/.openai", { recursive: true });
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
await build({
  entryPoints: ["src/worker.js"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  loader: { ".css": "text", ".txt": "text" },
  outfile: "dist/server/index.js",
  minify: false,
  legalComments: "eof",
});
