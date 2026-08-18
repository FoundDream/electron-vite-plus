import { once } from "node:events";
import { buildApp } from "./build.js";
import { loadElectronConfig } from "./config.js";
import { ElectronRunner } from "./electron.js";
import type { PreviewOptions } from "./types.js";

export async function previewApp(options: PreviewOptions = {}): Promise<number> {
  if (!options.skipBuild) await buildApp(options);
  const resolved = await loadElectronConfig(options, "build");
  const runner = new ElectronRunner({
    root: resolved.root,
    ...(options.electronArgs ? { args: options.electronArgs } : {}),
  });
  const child = runner.start();
  const [code] = (await once(child, "exit")) as [number | null, NodeJS.Signals | null];
  return code ?? 0;
}
