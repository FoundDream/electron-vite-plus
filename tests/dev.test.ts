import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { startDevServer } from "../src/dev.js";
import { ElectronRunner, resolveElectronPath } from "../src/electron.js";
import type { ElectronProcessRunner } from "../src/electron.js";
import type { DevelopmentEvent } from "../src/index.js";

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
      { root: fixtureRoot, host: "127.0.0.1", port: 0, logLevel: "silent" },
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
      await waitFor(() => preloadReloadEvents >= 1);

      const preloadReloadsBeforeSharedChange = preloadReloadEvents;
      appendFileSync(path.join(fixtureRoot, "src/main/app-icon.txt"), "\nshared change\n");
      await waitFor(() => restarts === 2 && mainRestartEvents === 2);
      await delay(100);
      expect(preloadReloadEvents).toBe(preloadReloadsBeforeSharedChange);

      appendFileSync(path.join(fixtureRoot, "src/main/marker.ts"), '\nimport "./recovered.js";\n');
      await delay(250);
      expect(restarts).toBe(2);
      writeFileSync(path.join(fixtureRoot, "src/main/recovered.js"), "export {};\n");
      await waitFor(() => restarts === 3 && mainRestartEvents === 3);

      appendFileSync(path.join(fixtureRoot, "src/main/marker.ts"), "\n// rapid change 1\n");
      appendFileSync(path.join(fixtureRoot, "src/main/marker.ts"), "// rapid change 2\n");
      appendFileSync(path.join(fixtureRoot, "src/main/marker.ts"), "// rapid change 3\n");
      await waitFor(() => restarts === 4 && mainRestartEvents === 4);
      await delay(100);
      expect(restarts).toBe(4);
    } finally {
      await server.close();
      rmSync(fixtureRoot, { recursive: true, force: true });
    }

    expect(stops).toBe(1);
  });

  test("keeps process targets stable in renderer-only mode", async () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), "electron-vite-plus-renderer-only-"));
    cpSync(sourceFixtureRoot, fixtureRoot, { recursive: true });
    const events: DevelopmentEvent[] = [];
    let restarts = 0;
    let reloads = 0;
    const runner: ElectronProcessRunner = {
      start() {},
      async restart() {
        restarts += 1;
      },
      async stop() {},
    };

    const server = await startDevServer(
      {
        root: fixtureRoot,
        host: "127.0.0.1",
        port: 0,
        logLevel: "silent",
        rendererOnly: true,
      },
      {
        createElectronRunner: () => runner,
        onDevelopmentEvent: (event) => events.push(event),
        onPreloadReload: () => {
          reloads += 1;
        },
      },
    );

    try {
      appendFileSync(path.join(fixtureRoot, "src/main/marker.ts"), "\n// ignored main edit\n");
      appendFileSync(
        path.join(fixtureRoot, "src/preload/marker.ts"),
        "\n// ignored preload edit\n",
      );
      await delay(100);
      expect(restarts).toBe(0);
      expect(reloads).toBe(0);

      const rendererFile = path.join(fixtureRoot, "src/renderer/src.ts");
      appendFileSync(rendererFile, "\n// renderer-only HMR edit\n");
      await waitFor(() =>
        events.some((event) => event.target === "renderer" && event.phase === "file-change"),
      );
      expect(restarts).toBe(0);
      expect(reloads).toBe(0);
    } finally {
      await server.close();
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test(
    "observes a renderer HMR update applied by a real Electron client",
    { timeout: 20_000 },
    async () => {
      const fixtureRoot = mkdtempSync(path.join(tmpdir(), "electron-vite-plus-renderer-hmr-"));
      cpSync(sourceFixtureRoot, fixtureRoot, { recursive: true });
      const events: DevelopmentEvent[] = [];
      let electronOutput = "";
      const electronPath = resolveElectronPath(process.cwd());
      const server = await startDevServer(
        { root: fixtureRoot, host: "127.0.0.1", port: 0, logLevel: "silent" },
        {
          createElectronRunner: (options) => {
            const realRunner = new ElectronRunner({
              ...options,
              executablePath: electronPath,
              stdio: ["ignore", "pipe", "pipe"],
              ...(process.platform === "linux" ? { args: ["--no-sandbox"] } : {}),
              env: {
                ...options.env,
                ELECTRON_VITE_PLUS_HMR_TEST: "1",
              },
            });
            return {
              start() {
                const child = realRunner.start();
                child.stdout?.on("data", (chunk: Buffer) => {
                  electronOutput += chunk.toString();
                });
                child.stderr?.on("data", (chunk: Buffer) => {
                  electronOutput += chunk.toString();
                });
              },
              restart: () => realRunner.restart(),
              stop: () => realRunner.stop(),
            };
          },
          onDevelopmentEvent: (event) => events.push(event),
        },
      );

      try {
        await waitFor(
          () =>
            events.some(
              (event) => event.target === "renderer" && event.phase === "hmr-client-ready",
            ),
          15_000,
        );
        await waitFor(() => electronOutput.includes("EVP_HMR_MARKER initial"), 15_000);
        await delay(100);
        const rendererFile = path.join(fixtureRoot, "src/renderer/src.ts");
        const source = readFileSync(rendererFile, "utf8");
        writeFileSync(
          rendererFile,
          `${source.replace('hmrMarker = "initial"', 'hmrMarker = "updated"')}\n// HMR test update\n`,
        );

        await waitFor(
          () =>
            events.some((event) => event.target === "renderer" && event.phase === "file-change"),
          15_000,
          "renderer file change",
        );
        await waitFor(
          () =>
            events.some(
              (event) =>
                event.target === "renderer" &&
                event.phase === "hmr-send" &&
                event.kind === "update",
            ),
          15_000,
          "renderer HMR send",
        );
        await waitFor(
          () =>
            events.some(
              (event) => event.target === "renderer" && event.phase === "hmr-after-update",
            ),
          15_000,
          "renderer HMR apply",
        );
        expect(
          events.some(
            (event) =>
              event.target === "renderer" && event.phase === "hmr-send" && event.kind === "update",
          ),
        ).toBe(true);
        expect(
          events.find((event) => event.target === "renderer" && event.phase === "hmr-after-update")
            ?.durationMs,
        ).toBeTypeOf("number");
        await waitFor(() => electronOutput.includes("EVP_HMR_MARKER updated"), 15_000);
      } finally {
        await server.close();
        rmSync(fixtureRoot, { recursive: true, force: true });
      }
    },
  );

  test("rolls back resources when Electron startup fails", async () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), "electron-vite-plus-rollback-"));
    cpSync(sourceFixtureRoot, fixtureRoot, { recursive: true });
    let stops = 0;
    const runner: ElectronProcessRunner = {
      start() {
        throw new Error("simulated Electron startup failure");
      },
      async restart() {},
      async stop() {
        stops += 1;
      },
    };

    try {
      await expect(
        startDevServer(
          { root: fixtureRoot, host: "127.0.0.1", port: 0, logLevel: "silent" },
          { createElectronRunner: () => runner },
        ),
      ).rejects.toThrow("simulated Electron startup failure");
      expect(stops).toBe(1);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});

async function waitFor(
  predicate: () => boolean,
  timeout = 10_000,
  description = "development rebuild",
): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${description}`);
    await delay(25);
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
