import { build as viteBuild } from "vite-plus";
import { createTargetConfigs, loadElectronConfig } from "./config.js";
import type { CommonOptions } from "./types.js";

export async function buildApp(options: CommonOptions = {}): Promise<void> {
  const resolved = await loadElectronConfig(options, "build");
  const targets = createTargetConfigs(resolved);

  for (const [name, config] of Object.entries(targets)) {
    if (!config) continue;
    if (options.logLevel !== "silent") {
      console.log(`\n[electron-vite-plus] building ${name}`);
    }
    await viteBuild(config);
  }
}
