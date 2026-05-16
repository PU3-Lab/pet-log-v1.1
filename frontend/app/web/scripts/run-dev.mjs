import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const envFile = process.env.PET_LOG_FRONTEND_ENV_FILE ?? ".env.dev";
const envPath = resolve(appRoot, envFile);

if (!existsSync(envPath)) {
  console.error(`Missing frontend env file: ${envPath}`);
  process.exit(1);
}

const nextBin = resolve(appRoot, "node_modules", "next", "dist", "bin", "next");
const envFromFile = parseEnv(readFileSync(envPath, "utf8"));
const nextArgs = [nextBin, "dev", ...process.argv.slice(2)];

const child = spawn(process.execPath, nextArgs, {
  cwd: appRoot,
  env: { ...envFromFile, ...process.env },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
