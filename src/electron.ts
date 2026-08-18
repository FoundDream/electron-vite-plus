import { type ChildProcess, spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { once } from "node:events";

export interface ElectronRunnerOptions {
  root: string;
  env?: NodeJS.ProcessEnv;
  args?: string[];
  onExit?: (code: number | null, signal: NodeJS.Signals | null) => void;
}

export interface ElectronProcessRunner {
  start(): unknown;
  restart(): Promise<void>;
  stop(): Promise<void>;
}

export class ElectronRunner implements ElectronProcessRunner {
  private child: ChildProcess | undefined;
  private stopping = false;

  constructor(private readonly options: ElectronRunnerOptions) {}

  start(): ChildProcess {
    const electronPath = resolveElectronPath(this.options.root);
    this.stopping = false;
    this.child = spawn(electronPath, [this.options.root, ...(this.options.args ?? [])], {
      cwd: this.options.root,
      stdio: "inherit",
      env: { ...process.env, ...this.options.env },
    });
    this.child.once("exit", (code, signal) => {
      this.child = undefined;
      if (!this.stopping) this.options.onExit?.(code, signal);
    });
    return this.child;
  }

  async restart(): Promise<void> {
    await this.stop();
    this.start();
  }

  async stop(): Promise<void> {
    const child = this.child;
    if (!child || child.exitCode !== null) return;
    this.stopping = true;
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), delay(2_000)]);
    if (child.exitCode === null) {
      child.kill("SIGKILL");
      await once(child, "exit");
    }
    this.child = undefined;
  }
}

export function resolveElectronPath(root: string): string {
  if (process.env.ELECTRON_EXEC_PATH) return process.env.ELECTRON_EXEC_PATH;
  const requireFromApp = createRequire(path.join(root, "package.json"));
  const electronPath = requireFromApp("electron") as unknown;
  if (typeof electronPath !== "string") {
    throw new Error("The installed electron package did not return an executable path.");
  }
  return electronPath;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
