import { spawn } from "node:child_process";
import { createRequire } from "node:module";

// Accept both Next's --hostname and the --host convention used by preview tools.
const args = process.argv.slice(2).flatMap((arg) => {
  if (arg === "--strictPort") return []; // Next fails if an explicit port is occupied.
  if (arg === "--host") return ["--hostname"];
  if (arg.startsWith("--host=")) return [arg.replace("--host=", "--hostname=")];
  return [arg];
});
if (!args.some((arg) => arg === "--hostname" || arg.startsWith("--hostname="))) {
  args.push("--hostname", "0.0.0.0");
}
const require = createRequire(import.meta.url);
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", ...args], { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 0; });
