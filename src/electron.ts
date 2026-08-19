import { type ChildProcess, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

export interface ElectronRunnerOptions {
  root: string;
  env?: NodeJS.ProcessEnv;
  args?: string[];
  executablePath?: string;
  onExit?: (code: number | null, signal: NodeJS.Signals | null) => void;
  onError?: (error: Error) => void;
}

export interface ElectronProcessRunner {
  start(): unknown;
  restart(): Promise<void>;
  stop(): Promise<void>;
}

export interface ElectronRuntimeInfo {
  version?: string;
  major?: number;
  nodeTarget: string;
  chromeTarget: string;
  supportsEsm: boolean;
}

interface RuntimeTarget {
  node: string;
  chrome: string;
}

const runtimeTargets: Record<number, RuntimeTarget> = {
  32: { node: "20.16", chrome: "128" },
  33: { node: "20.18", chrome: "130" },
  34: { node: "20.18", chrome: "132" },
  35: { node: "22.14", chrome: "134" },
  36: { node: "22.14", chrome: "136" },
  37: { node: "22.16", chrome: "138" },
  38: { node: "22.19", chrome: "140" },
  39: { node: "22.20", chrome: "142" },
  40: { node: "24.14", chrome: "144" },
  41: { node: "24.14", chrome: "146" },
  42: { node: "24.15", chrome: "148" },
  43: { node: "24.17", chrome: "150" },
};
const supportedElectronMajors = Object.keys(runtimeTargets).map(Number);
const minimumElectronMajor = Math.min(...supportedElectronMajors);
const maximumElectronMajor = Math.max(...supportedElectronMajors);

export class ElectronRunner implements ElectronProcessRunner {
  private child: ChildProcess | undefined;
  private operation: Promise<void> = Promise.resolve();
  private operationPending = false;
  private readonly intentionalStops = new WeakSet<ChildProcess>();

  constructor(private readonly options: ElectronRunnerOptions) {}

  start(): ChildProcess {
    if (this.operationPending) {
      throw new Error("Cannot start Electron while another lifecycle operation is running.");
    }
    return this.startChild();
  }

  restart(): Promise<void> {
    return this.enqueue(async () => {
      await this.stopCurrentChild();
      this.startChild();
    });
  }

  stop(): Promise<void> {
    return this.enqueue(() => this.stopCurrentChild());
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    this.operationPending = true;
    const next = this.operation.then(operation, operation);
    const tracked = next
      .catch(() => undefined)
      .finally(() => {
        if (this.operation === tracked) this.operationPending = false;
      });
    this.operation = tracked;
    return next;
  }

  private startChild(): ChildProcess {
    if (this.child && !hasExited(this.child)) {
      throw new Error("Electron is already running.");
    }

    const electronPath = this.options.executablePath ?? resolveElectronPath(this.options.root);
    const child = spawn(electronPath, [this.options.root, ...(this.options.args ?? [])], {
      cwd: this.options.root,
      stdio: "inherit",
      env: { ...process.env, ...this.options.env },
    });
    this.child = child;

    child.once("error", (error) => {
      if (this.child === child) this.child = undefined;
      if (!this.intentionalStops.has(child)) this.options.onError?.(error);
    });
    child.once("exit", (code, signal) => {
      if (this.child === child) this.child = undefined;
      if (!this.intentionalStops.has(child)) this.options.onExit?.(code, signal);
    });
    return child;
  }

  private async stopCurrentChild(): Promise<void> {
    const child = this.child;
    if (!child) return;
    if (hasExited(child)) {
      if (this.child === child) this.child = undefined;
      return;
    }

    this.intentionalStops.add(child);
    child.kill("SIGTERM");
    const exitedAfterTerm = await waitForExit(child, 2_000);

    if (!exitedAfterTerm && !hasExited(child)) {
      child.kill("SIGKILL");
      const exitedAfterKill = await waitForExit(child, 2_000);
      if (!exitedAfterKill && !hasExited(child)) {
        throw new Error(`Electron process ${child.pid ?? "unknown"} did not exit after SIGKILL.`);
      }
    }

    if (this.child === child) this.child = undefined;
  }
}

export function resolveElectronPath(root: string): string {
  if (process.env.ELECTRON_EXEC_PATH) return process.env.ELECTRON_EXEC_PATH;

  try {
    const requireFromApp = createRequire(path.join(root, "package.json"));
    const electronPath = requireFromApp("electron") as unknown;
    if (typeof electronPath !== "string") {
      throw new Error("the electron package did not return an executable path");
    }
    return electronPath;
  } catch (error) {
    throw new Error(
      `Unable to resolve Electron from ${root}. Install electron in the application or set ELECTRON_EXEC_PATH.`,
      { cause: error },
    );
  }
}

export function resolveElectronRuntime(root: string): ElectronRuntimeInfo {
  let version: string | undefined;

  try {
    const requireFromApp = createRequire(path.join(root, "package.json"));
    const packagePath = requireFromApp.resolve("electron/package.json");
    const packageData = JSON.parse(readFileSync(packagePath, "utf8")) as { version?: unknown };
    if (typeof packageData.version === "string") version = packageData.version;
  } catch {
    // Building without Electron installed is supported. Use the minimum peer target.
  }

  const major = version ? Number.parseInt(version.split(".", 1)[0] ?? "", 10) : undefined;
  const resolvedMajor = major !== undefined && Number.isFinite(major) ? major : undefined;
  if (
    resolvedMajor !== undefined &&
    (resolvedMajor < minimumElectronMajor || resolvedMajor > maximumElectronMajor)
  ) {
    throw new Error(
      `Electron ${version} is unsupported. Install Electron ${minimumElectronMajor} through ${maximumElectronMajor}.`,
    );
  }
  const target = resolveRuntimeTarget(resolvedMajor);

  return {
    ...(version ? { version } : {}),
    ...(resolvedMajor !== undefined ? { major: resolvedMajor } : {}),
    nodeTarget: `node${target.node}`,
    chromeTarget: `chrome${target.chrome}`,
    supportsEsm: resolvedMajor === undefined || resolvedMajor >= 28,
  };
}

function resolveRuntimeTarget(major: number | undefined): RuntimeTarget {
  const selectedMajor = major ?? minimumElectronMajor;
  return runtimeTargets[selectedMajor] ?? runtimeTargets[minimumElectronMajor]!;
}

function hasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

function waitForExit(child: ChildProcess, timeout: number): Promise<boolean> {
  if (hasExited(child)) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (exited: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off("exit", onExit);
      child.off("error", onError);
      resolve(exited);
    };
    const onExit = (): void => finish(true);
    const onError = (): void => finish(true);
    const timer = setTimeout(() => finish(hasExited(child)), timeout);
    child.once("exit", onExit);
    child.once("error", onError);
  });
}
