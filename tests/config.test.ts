import path from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { createTargetConfigs, loadElectronConfig } from "../src/config.js";

const fixtureRoot = path.resolve(import.meta.dirname, "fixtures/basic");

describe("electron-vite-plus config", () => {
  test("loads a Vite+ config with Electron targets", async () => {
    const resolved = await loadElectronConfig({ root: fixtureRoot });
    const targets = createTargetConfigs(resolved);

    expect(targets.main?.build?.outDir).toBe(path.join(fixtureRoot, "out/main"));
    expect(targets.preload?.build?.outDir).toBe(path.join(fixtureRoot, "out/preload"));
    expect(targets.renderer?.build?.outDir).toBe(path.join(fixtureRoot, "out/renderer"));
    expect(targets.renderer?.root).toBe(path.join(fixtureRoot, "src/renderer"));
    expect(targets.renderer?.define).toEqual({
      __EVP_TOP_LEVEL_CONFIG__: JSON.stringify("inherited"),
    });
    expect(targets.main?.define).toBeUndefined();
  });

  test("uses Electron-safe process formats and externals", async () => {
    const targets = createTargetConfigs(await loadElectronConfig({ root: fixtureRoot }));
    const mainOutput = targets.main?.build?.rolldownOptions?.output;
    const preloadOutput = targets.preload?.build?.rolldownOptions?.output;
    const mainExternal = targets.main?.build?.rolldownOptions?.external;

    expect(mainOutput).toMatchObject({ format: "es", entryFileNames: "[name].js" });
    expect(preloadOutput).toMatchObject({ format: "cjs", entryFileNames: "[name].cjs" });
    expect(mainExternal).toContain("electron");
    expect(mainExternal).toContain("nanoid");
  });
});
