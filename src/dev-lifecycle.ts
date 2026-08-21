import type { DevelopmentEventListener } from "./dev-events.js";
import { emitDevelopmentEvent } from "./dev-events.js";

export type ProcessTarget = "main" | "preload";

export interface DevelopmentLifecycleOptions {
  restartElectron: () => Promise<void>;
  reloadRenderer: () => void;
  onEvent: DevelopmentEventListener;
  onError?: (error: unknown) => void;
  settleDelay?: number;
}

/**
 * Coalesces independent main/preload watch builds into one application lifecycle action.
 * A main rebuild subsumes a preload reload because the new Electron process loads both outputs.
 */
export class DevelopmentLifecycleCoordinator {
  private readonly active = new Set<ProcessTarget>();
  private readonly failed = new Set<ProcessTarget>();
  private readonly dirty = new Set<ProcessTarget>();
  private timer: NodeJS.Timeout | undefined;
  private actionWork: Promise<void> | undefined;
  private activeForRuntime = false;
  private closed = false;

  constructor(private readonly options: DevelopmentLifecycleOptions) {}

  activate(): void {
    this.activeForRuntime = true;
    this.dirty.clear();
  }

  buildStarted(target: ProcessTarget): void {
    if (this.closed) return;
    this.cancelTimer();
    this.active.add(target);
    emitDevelopmentEvent(this.options.onEvent, { target, phase: "build-start" });
  }

  buildSucceeded(target: ProcessTarget, durationMs?: number): void {
    if (this.closed) return;
    this.active.delete(target);
    this.failed.delete(target);
    this.dirty.add(target);
    emitDevelopmentEvent(this.options.onEvent, {
      target,
      phase: "build-success",
      ...(durationMs === undefined ? {} : { durationMs }),
    });
    this.scheduleFlush();
  }

  buildFailed(target: ProcessTarget, error: unknown, durationMs?: number): void {
    if (this.closed) return;
    this.active.delete(target);
    this.failed.add(target);
    emitDevelopmentEvent(this.options.onEvent, {
      target,
      phase: "build-error",
      ...(durationMs === undefined ? {} : { durationMs }),
      message: error instanceof Error ? error.message : String(error),
    });
    this.cancelTimer();
  }

  async close(): Promise<void> {
    this.closed = true;
    this.cancelTimer();
    await this.actionWork;
  }

  private scheduleFlush(): void {
    if (!this.activeForRuntime || this.closed || this.active.size > 0 || this.failed.size > 0) {
      return;
    }
    this.cancelTimer();
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, this.options.settleDelay ?? 25);
  }

  private async flush(): Promise<void> {
    if (
      this.closed ||
      !this.activeForRuntime ||
      this.active.size > 0 ||
      this.failed.size > 0 ||
      this.dirty.size === 0
    ) {
      return;
    }
    if (this.actionWork) return;

    const action = this.dirty.has("main") ? "restart" : "reload";
    this.dirty.clear();
    this.actionWork = (async () => {
      emitDevelopmentEvent(this.options.onEvent, { target: "lifecycle", phase: action });
      if (action === "restart") {
        await this.options.restartElectron();
      } else {
        this.options.reloadRenderer();
      }
    })()
      .catch((error: unknown) => {
        emitDevelopmentEvent(this.options.onEvent, {
          target: "lifecycle",
          phase: "build-error",
          message: error instanceof Error ? error.message : String(error),
        });
        this.options.onError?.(error);
      })
      .finally(() => {
        this.actionWork = undefined;
        if (this.dirty.size > 0) this.scheduleFlush();
      });

    await this.actionWork;
  }

  private cancelTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
