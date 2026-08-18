import { appendFileSync, cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { startDevServer } from "../src/dev.js";
import type { ElectronProcessRunner } from "../src/electron.js";

const sourceFixtureRoot = path.resolve(import.meta.dirname, "fixtures/basic");

describe("electron-vite-plus dev server", () => {
  test("restarts main and reloads renderer after preload rebuilds", async () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), "electron-vite-plus-dev-"));
    cpSync(sourceFixtureRoot, fixtureRoot, { recursive: true });

    let starts = 0;
    let restarts = 0;
    let stops = 0;
    let mainRestartEvents = 0;
    let preloadReloadEvents = 0;
    const runner: ElectronProcessRunner = {
      start() {
        starts += 1;
      },
      async restart() {
        restarts += 1;
      },
      async stop() {
        stops += 1;
      },
    };

    const server = await startDevServer(
      { root: fixtureRoot, port: 0, logLevel: "silent" },
      {
        createElectronRunner: () => runner,
        onMainRestart: () => {
          mainRestartEvents += 1;
        },
        onPreloadReload: () => {
          preloadReloadEvents += 1;
        },
      },
    );

    try {
      expect(server.rendererUrl).toMatch(/^http:\/\//);
      expect(starts).toBe(1);

      appendFileSync(
        path.join(fixtureRoot, "src/main/marker.ts"),
        "\nexport const devMainChange = true;\n",
      );
      await waitFor(() => restarts === 1 && mainRestartEvents === 1);

      appendFileSync(
        path.join(fixtureRoot, "src/preload/marker.ts"),
        "\nexport const devPreloadChange = true;\n",
      );
      await waitFor(() => preloadReloadEvents === 1);
    } finally {
      await server.close();
      rmSync(fixtureRoot, { recursive: true, force: true });
    }

    expect(stops).toBe(1);
  });
});

async function waitFor(predicate: () => boolean, timeout = 10_000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for development rebuild");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}
