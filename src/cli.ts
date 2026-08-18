#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { buildApp } from "./build.js";
import { startDevServer } from "./dev.js";
import { previewApp } from "./preview.js";

const commands = new Set(["dev", "build", "preview"]);

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const separator = rawArgs.indexOf("--");
  const toolArgs = separator === -1 ? rawArgs : rawArgs.slice(0, separator);
  const electronArgs = separator === -1 ? [] : rawArgs.slice(separator + 1);
  const { values, positionals } = parseArgs({
    args: toolArgs,
    allowPositionals: true,
    options: {
      config: { type: "string", short: "c" },
      mode: { type: "string", short: "m" },
      "out-dir": { type: "string" },
      host: { type: "string" },
      port: { type: "string" },
      "skip-build": { type: "boolean" },
      "log-level": { type: "string" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });

  if (values.version) {
    console.log(readVersion());
    return;
  }
  if (values.help) {
    printHelp();
    return;
  }

  const first = positionals[0];
  const command = first && commands.has(first) ? first : "dev";
  const rootPosition = command === first ? positionals[1] : first;
  const root = path.resolve(rootPosition ?? process.cwd());
  const logLevel = values["log-level"] as "info" | "warn" | "error" | "silent" | undefined;
  const common = {
    root,
    ...(values.config ? { configFile: values.config } : {}),
    ...(values.mode ? { mode: values.mode } : {}),
    ...(values["out-dir"] ? { outDir: values["out-dir"] } : {}),
    ...(logLevel ? { logLevel } : {}),
  };

  if (command === "build") {
    await buildApp(common);
    return;
  }
  if (command === "preview") {
    const code = await previewApp({
      ...common,
      ...(values["skip-build"] ? { skipBuild: true } : {}),
      electronArgs,
    });
    process.exitCode = code;
    return;
  }

  const port = values.port ? Number.parseInt(values.port, 10) : undefined;
  if (port !== undefined && !Number.isFinite(port)) {
    throw new Error(`Invalid port: ${values.port}`);
  }
  await startDevServer({
    ...common,
    ...(values.host ? { host: values.host } : {}),
    ...(port !== undefined ? { port } : {}),
    electronArgs,
  });
}

function readVersion(): string {
  const packagePath = new URL("../package.json", import.meta.url);
  const packageData = JSON.parse(readFileSync(packagePath, "utf8")) as { version: string };
  return packageData.version;
}

function printHelp(): void {
  console.log(`electron-vite-plus

Usage:
  electron-vite-plus [dev] [root] [options] [-- electron-args]
  electron-vite-plus build [root] [options]
  electron-vite-plus preview [root] [options] [-- electron-args]

Options:
  -c, --config <file>       Use a specific vite.config file
  -m, --mode <mode>         Set the Vite mode
      --out-dir <dir>       Set the base output directory
      --host <host>         Renderer dev-server host
      --port <port>         Renderer dev-server port
      --skip-build          Preview the existing build
      --log-level <level>   info | warn | error | silent
  -h, --help                Show help
  -v, --version             Show version`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`\n[electron-vite-plus] ${message}`);
  process.exitCode = 1;
});
