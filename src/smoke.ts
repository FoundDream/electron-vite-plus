import type { ChildProcess } from "node:child_process";
import { buildApp } from "./build.js";
import { loadElectronConfig } from "./config.js";
import { ElectronRunner, printElectronRuntimeWarning, resolveElectronRuntime } from "./electron.js";
import type { SmokeOptions } from "./types.js";

export const smokeReadyMarker = "EVP_SMOKE_READY";
const defaultSmokeTimeout = 15_000;

type SmokeOutcome =
  | { type: "ready" }
  | { type: "exit"; code: number | null; signal: NodeJS.Signals | null }
  | { type: "timeout" };

export async function smokeApp(options: SmokeOptions = {}): Promise<number> {
  if (!options.skipBuild) await buildApp(options);
  const resolved = await loadElectronConfig(options, "build");
  if (options.skipBuild) {
    printElectronRuntimeWarning(resolveElectronRuntime(resolved.root), options.logLevel);
  }
  const timeout = options.timeout ?? defaultSmokeTimeout;
  if (!Number.isInteger(timeout) || timeout <= 0) {
    throw new Error(`Smoke timeout must be a positive integer, received ${timeout}.`);
  }

  const runner = new ElectronRunner({
    root: resolved.root,
    ...(options.electronArgs ? { args: options.electronArgs } : {}),
    env: { ELECTRON_VITE_PLUS_SMOKE: "1" },
    stdio: ["inherit", "pipe", "pipe"],
  });
  const child = runner.start();
  const outcome = await waitForSmokeOutcome(child, timeout, options.logLevel === "silent");

  if (outcome.type === "ready") {
    await runner.stop();
    if (options.logLevel !== "silent") {
      console.log("[electron-vite-plus] Runtime smoke check passed.");
    }
    return 0;
  }
  if (outcome.type === "timeout") {
    console.error(
      `[electron-vite-plus] Runtime smoke check timed out after ${timeout}ms without receiving ${smokeReadyMarker}.`,
    );
    await runner.stop();
    return 1;
  }
  if (outcome.signal) {
    console.error(
      `[electron-vite-plus] Electron terminated by signal ${outcome.signal} before runtime readiness.`,
    );
    return 1;
  }
  const code = outcome.code ?? 1;
  console.error(`[electron-vite-plus] Electron exited with code ${code} before runtime readiness.`);
  return code === 0 ? 1 : code;
}

function waitForSmokeOutcome(
  child: ChildProcess,
  timeout: number,
  silent: boolean,
): Promise<SmokeOutcome> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let output = "";
    const cleanup = (): void => {
      clearTimeout(timer);
      child.off("error", onError);
      child.off("exit", onExit);
      child.stdout?.off("data", onStdout);
      child.stderr?.off("data", onStderr);
    };
    const finish = (outcome: SmokeOutcome): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(outcome);
    };
    const inspect = (chunk: Buffer | string): void => {
      output = `${output}${chunk.toString()}`.slice(-Math.max(4_096, smokeReadyMarker.length));
      if (output.includes(smokeReadyMarker)) finish({ type: "ready" });
    };
    const onStdout = (chunk: Buffer | string): void => {
      if (!silent) process.stdout.write(chunk);
      inspect(chunk);
    };
    const onStderr = (chunk: Buffer | string): void => {
      if (!silent) process.stderr.write(chunk);
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
      finish({ type: "exit", code, signal });
    };
    const onError = (error: Error): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const timer = setTimeout(() => finish({ type: "timeout" }), timeout);

    child.stdout?.on("data", onStdout);
    child.stderr?.on("data", onStderr);
    child.once("exit", onExit);
    child.once("error", onError);
  });
}
