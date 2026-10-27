import { build } from "esbuild";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tsImport } from "tsx/esm/api";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "docs");
const basePath = process.env.PREVIEW_BASE_PATH ?? "/MacVersus";
if (basePath && !/^\/[A-Za-z0-9/_-]+$/.test(basePath)) throw new Error("PREVIEW_BASE_PATH inválido.");
const [{ dataset }, { mergeDatasetUpdate, MAX_FEED_BYTES }] = await Promise.all([
  tsImport("../src/data/catalog.ts", import.meta.url),
  tsImport("../src/lib/dataset-updates.ts", import.meta.url),
]);
const feedPath = resolve(root, "src/data/reviewed-updates.json");
if ((await stat(feedPath)).size > MAX_FEED_BYTES) throw new Error("O feed local excede 2 MiB.");
mergeDatasetUpdate(dataset, JSON.parse(await readFile(feedPath, "utf8")));
// Validate before replacing any previously published asset.
await mkdir(output, { recursive: true });
await rm(resolve(output, "assets"), { recursive: true, force: true });
const result = await build({
  absWorkingDir: root, entryPoints: { app: "src/preview.tsx" }, outdir: "docs/assets", entryNames: "[name]-[hash]",
  bundle: true, platform: "browser", format: "esm", target: ["es2022", "safari16.4"], jsx: "automatic",
  minify: true, sourcemap: false, metafile: true, legalComments: "eof", charset: "utf8", tsconfig: "tsconfig.json",
  define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_BASE_PATH": JSON.stringify(basePath), "process.env.BENCHMARK_DATA_URL": '""' },
});
const entry = Object.entries(result.metafile.outputs).find(([, value]) => value.entryPoint === "src/preview.tsx");
if (!entry) throw new Error("Bundle da prévia não foi gerado.");
const asset = path => `${basePath}/${relative(output, resolve(root, path)).replaceAll("\\", "/")}`;
const js = asset(entry[0]); const css = entry[1].cssBundle ? asset(entry[1].cssBundle) : null;
await cp(resolve(root, "public"), output, { recursive: true, force: true });
await writeFile(resolve(output, ".nojekyll"), "");
await writeFile(resolve(output, "index.html"), `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f8fb"><title>MacVersus | Compare configurações reais</title><meta name="description" content="Compare MacBooks por chip, GPU, RAM e SSD. Benchmarks com fonte e contexto. Prévia estática da base publicada."><link rel="icon" type="image/svg+xml" href="${basePath}/brand/macversus-icon.svg">${css ? `<link rel="stylesheet" href="${css}">` : ""}</head><body><div id="root"></div><noscript>Ative o JavaScript para usar o comparador MacVersus.</noscript><script type="module" src="${js}"></script></body></html>\n`);
console.log(`Prévia estática gerada em docs/index.html. Base: ${basePath || "/"}. Nenhum endpoint de servidor é necessário.`);
