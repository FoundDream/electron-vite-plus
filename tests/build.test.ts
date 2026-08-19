import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { buildApp } from "../src/build.js";

const fixtureRoot = path.resolve(import.meta.dirname, "fixtures/basic");
const reactFixtureRoot = path.resolve(import.meta.dirname, "fixtures/react");
const vueFixtureRoot = path.resolve(import.meta.dirname, "fixtures/vue");

describe("electron-vite-plus build", () => {
  test("builds main, preload, and renderer with Vite+", async () => {
    await buildApp({ root: fixtureRoot, logLevel: "silent" });

    expect(existsSync(path.join(fixtureRoot, "out/main/index.js"))).toBe(true);
    expect(existsSync(path.join(fixtureRoot, "out/preload/index.cjs"))).toBe(true);
    expect(existsSync(path.join(fixtureRoot, "out/renderer/index.html"))).toBe(true);
    const mainAssets = readdirSync(path.join(fixtureRoot, "out/main/assets"));
    const emittedAsset = mainAssets.find((file) => file.endsWith(".txt"));
    expect(emittedAsset).toBeDefined();
    expect(readFileSync(path.join(fixtureRoot, "out/main/index.js"), "utf8")).toContain(
      `./assets/${emittedAsset}`,
    );
    expect(existsSync(path.join(fixtureRoot, "out/main/public-icon.txt"))).toBe(false);
    expect(readFileSync(path.join(fixtureRoot, "out/main/index.js"), "utf8")).toContain(
      "../../resources/public-icon.txt",
    );
    const preloadBundle = readFileSync(path.join(fixtureRoot, "out/preload/index.cjs"), "utf8");
    expect(preloadBundle).toContain("__dirname");
    expect(preloadBundle).not.toContain("import.meta");
  });

  test("inherits top-level React plugins for the renderer build", async () => {
    await buildApp({ root: reactFixtureRoot, logLevel: "silent" });

    expect(readRendererBundle(reactFixtureRoot)).toContain("electron-vite-plus-react-ready");
  });

  test("inherits top-level Vue plugins for the renderer build", async () => {
    await buildApp({ root: vueFixtureRoot, logLevel: "silent" });

    expect(readRendererBundle(vueFixtureRoot)).toContain("electron-vite-plus-vue-ready");
  });
});

function readRendererBundle(root: string): string {
  const assetsDir = path.join(root, "out/renderer/assets");
  const script = readdirSync(assetsDir).find((file) => file.endsWith(".js"));
  if (!script) throw new Error(`No renderer JavaScript bundle found in ${assetsDir}`);
  return readFileSync(path.join(assetsDir, script), "utf8");
}
