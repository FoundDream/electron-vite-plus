import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { ElectronRunner } from "../src/electron.js";
import { previewApp } from "../src/preview.js";

const fixtureRoot = path.resolve(import.meta.dirname, "fixtures/basic");

describe("electron-vite-plus preview", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("reports signal termination as a failure", async () => {
    mockExit(null, "SIGTERM");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      previewApp({ root: fixtureRoot, skipBuild: true, logLevel: "silent" }),
    ).resolves.toBe(1);
    expect(error).toHaveBeenCalledWith(
      "[electron-vite-plus] Electron terminated by signal SIGTERM.",
    );
  });

  test.each([0, 7])("preserves exit code %i", async (code) => {
    mockExit(code, null);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      previewApp({ root: fixtureRoot, skipBuild: true, logLevel: "silent" }),
    ).resolves.toBe(code);
    expect(error).not.toHaveBeenCalled();
  });

  test("fails defensively when Electron exits without a code or signal", async () => {
    mockExit(null, null);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      previewApp({ root: fixtureRoot, skipBuild: true, logLevel: "silent" }),
    ).resolves.toBe(1);
    expect(error).toHaveBeenCalledWith(
      "[electron-vite-plus] Electron exited without an exit code.",
    );
  });
});

function mockExit(code: number | null, signal: NodeJS.Signals | null): void {
  const child = new EventEmitter() as ChildProcess;
  vi.spyOn(ElectronRunner.prototype, "start").mockImplementation(() => {
    queueMicrotask(() => child.emit("exit", code, signal));
    return child;
  });
}
