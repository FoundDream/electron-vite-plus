import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { ElectronRunner } from "../src/electron.js";
import { smokeApp, smokeReadyMarker } from "../src/smoke.js";

const fixtureRoot = path.resolve(import.meta.dirname, "fixtures/basic");

describe("electron-vite-plus runtime smoke", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("passes only after receiving the readiness marker", async () => {
    mockChild((child) => {
      child.stdout?.emit("data", Buffer.from(`${smokeReadyMarker}\n`));
    });
    const stop = vi.spyOn(ElectronRunner.prototype, "stop").mockResolvedValue();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(
      smokeApp({ root: fixtureRoot, skipBuild: true, timeout: 100, logLevel: "silent" }),
    ).resolves.toBe(0);
    expect(stop).toHaveBeenCalledOnce();
    expect(log).not.toHaveBeenCalled();
  });

  test("fails when Electron exits before readiness", async () => {
    mockChild((child) => child.emit("exit", null, "SIGABRT"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      smokeApp({ root: fixtureRoot, skipBuild: true, timeout: 100, logLevel: "silent" }),
    ).resolves.toBe(1);
    expect(error).toHaveBeenCalledWith(
      "[electron-vite-plus] Electron terminated by signal SIGABRT before runtime readiness.",
    );
  });

  test("fails and stops Electron after a readiness timeout", async () => {
    mockChild();
    const stop = vi.spyOn(ElectronRunner.prototype, "stop").mockResolvedValue();
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      smokeApp({ root: fixtureRoot, skipBuild: true, timeout: 5, logLevel: "silent" }),
    ).resolves.toBe(1);
    expect(stop).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith(expect.stringContaining("timed out after 5ms"));
  });
});

function mockChild(onStart?: (child: ChildProcess) => void): ChildProcess {
  const child = new EventEmitter() as ChildProcess;
  Object.defineProperties(child, {
    stdout: { value: new PassThrough() },
    stderr: { value: new PassThrough() },
  });
  vi.spyOn(ElectronRunner.prototype, "start").mockImplementation(() => {
    if (onStart) queueMicrotask(() => onStart(child));
    return child;
  });
  return child;
}
