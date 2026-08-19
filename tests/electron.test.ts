import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { ElectronRunner, resolveElectronRuntime } from "../src/electron.js";

describe("ElectronRunner", () => {
  test("serializes restarts and suppresses intentional exit callbacks", async () => {
    const root = createNodeApp("setInterval(() => undefined, 1_000);");
    let unexpectedExits = 0;
    const runner = new ElectronRunner({
      root,
      executablePath: process.execPath,
      onExit: () => {
        unexpectedExits += 1;
      },
    });

    try {
      expect(runner.start().pid).toBeTypeOf("number");
      await Promise.all([runner.restart(), runner.restart()]);
      await runner.stop();
      expect(unexpectedExits).toBe(0);
    } finally {
      await runner.stop();
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("reports unexpected exits and spawn failures", async () => {
    const root = createNodeApp("process.exit(7);");
    try {
      const exit = promiseWithTimeout<[number | null, NodeJS.Signals | null]>((resolve) => {
        const runner = new ElectronRunner({
          root,
          executablePath: process.execPath,
          onExit: (code, signal) => resolve([code, signal]),
        });
        runner.start();
      });
      await expect(exit).resolves.toEqual([7, null]);

      const spawnFailure = promiseWithTimeout<Error>((resolve) => {
        const runner = new ElectronRunner({
          root,
          executablePath: path.join(root, "missing-electron"),
          onError: resolve,
        });
        runner.start();
      });
      await expect(spawnFailure).resolves.toMatchObject({ code: "ENOENT" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("maps installed Electron runtimes and rejects versions below the support floor", () => {
    const root = createNodeApp("export {};");
    const electronPackage = path.join(root, "node_modules/electron/package.json");
    mkdirSync(path.dirname(electronPackage), { recursive: true });

    try {
      writeFileSync(electronPackage, JSON.stringify({ name: "electron", version: "42.3.1" }));
      expect(resolveElectronRuntime(root)).toMatchObject({
        version: "42.3.1",
        nodeTarget: "node24.15",
        chromeTarget: "chrome148",
      });

      writeFileSync(electronPackage, JSON.stringify({ name: "electron", version: "31.7.7" }));
      expect(() => resolveElectronRuntime(root)).toThrow("Electron 31.7.7 is unsupported");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("uses conservative targets with a warning for the next Electron beta", () => {
    const root = createNodeApp("export {};");
    const electronPackage = path.join(root, "node_modules/electron/package.json");
    mkdirSync(path.dirname(electronPackage), { recursive: true });
    const version = process.env.EVP_NEXT_ELECTRON_VERSION ?? "44.0.0-beta.1";

    try {
      writeFileSync(electronPackage, JSON.stringify({ name: "electron", version }));
      expect(resolveElectronRuntime(root)).toMatchObject({
        version,
        nodeTarget: "node24.17",
        chromeTarget: "chrome150",
        warning: expect.stringContaining("newer than the validated Electron 43 target table"),
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function createNodeApp(source: string): string {
  const root = mkdtempSync(path.join(tmpdir(), "electron-vite-plus-runner-"));
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "runner-fixture", private: true, main: "index.cjs" }),
  );
  writeFileSync(path.join(root, "index.cjs"), source);
  return root;
}

function promiseWithTimeout<T>(
  executor: (resolve: (value: T) => void, reject: (error: unknown) => void) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for child process")), 5_000);
    executor(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
