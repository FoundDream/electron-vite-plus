import { once } from "node:events";
import { buildApp } from "./build.js";
import { loadElectronConfig } from "./config.js";
import { ElectronRunner, printElectronRuntimeWarning, resolveElectronRuntime } from "./electron.js";
import type { PreviewOptions } from "./types.js";

export async function previewApp(options: PreviewOptions = {}): Promise<number> {
  if (!options.skipBuild) await buildApp(options);
  const resolved = await loadElectronConfig(options, "build");
  if (options.skipBuild) {
    printElectronRuntimeWarning(resolveElectronRuntime(resolved.root), options.logLevel);
  }
  const runner = new ElectronRunner({
    root: resolved.root,
    ...(options.electronArgs ? { args: options.electronArgs } : {}),
  });
  const child = runner.start();
  const [code, signal] = (await once(child, "exit")) as [number | null, NodeJS.Signals | null];

  if (signal) {
    console.error(`[electron-vite-plus] Electron terminated by signal ${signal}.`);
    return 1;
  }
  if (code === null) {
    console.error("[electron-vite-plus] Electron exited without an exit code.");
    return 1;
  }
  return code;
}
