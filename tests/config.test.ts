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
    expect(targets.main?.envPrefix).toEqual(["MAIN_VITE_", "VITE_"]);
    expect(targets.preload?.envPrefix).toEqual(["PRELOAD_VITE_", "VITE_"]);
    expect(targets.renderer?.envPrefix).toEqual(["RENDERER_VITE_", "VITE_"]);
    expect(targets.renderer?.envDir).toBe(fixtureRoot);
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
    expect(mainExternal).toContain("optional-native-addon");
    expect(targets.main?.build?.target).toBe("node24.17");
    expect(targets.renderer?.build?.target).toBe("chrome150");
  });

  test("rejects missing entries and conflicting output directories", async () => {
    const missingEntryConfig = await loadElectronConfig({ root: fixtureRoot });
    missingEntryConfig.electron.main = { entry: "src/main/missing.ts" };
    expect(() => createTargetConfigs(missingEntryConfig)).toThrow("entry does not exist");

    const conflictingOutputConfig = await loadElectronConfig({ root: fixtureRoot });
    conflictingOutputConfig.electron.preload = {
      entry: "src/preload/index.ts",
      build: { outDir: path.join(fixtureRoot, "out/main") },
    };
    expect(() => createTargetConfigs(conflictingOutputConfig)).toThrow(
      "resolve to overlapping output directories",
    );

    const invalidTargetConfig = await loadElectronConfig({ root: fixtureRoot });
    invalidTargetConfig.electron.main = {
      entry: "src/main/index.ts",
      build: { target: "chrome150" },
    };
    expect(() => createTargetConfigs(invalidTargetConfig)).toThrow(
      "main build.target must use a node* target",
    );
  });

  test("uses an extension that matches explicit module formats", async () => {
    const mainCjsConfig = await loadElectronConfig({ root: fixtureRoot });
    mainCjsConfig.electron.main = { entry: "src/main/index.ts", format: "cjs" };
    const mainOutput = createTargetConfigs(mainCjsConfig).main?.build?.rolldownOptions?.output;
    expect(mainOutput).toMatchObject({ format: "cjs", entryFileNames: "[name].cjs" });

    const mismatchedConfig = await loadElectronConfig({ root: fixtureRoot });
    mismatchedConfig.electron.main = {
      entry: "src/main/index.ts",
      build: { rolldownOptions: { output: { format: "cjs" } } },
    };
    expect(() => createTargetConfigs(mismatchedConfig)).toThrow(
      "output format must match electron.main.format (es)",
    );
  });
});
