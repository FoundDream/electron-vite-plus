import path from "node:path";
import { performance } from "node:perf_hooks";
import { watch as watchFiles } from "chokidar";
import type { FSWatcher } from "chokidar";
import { createServer, build as viteBuild, mergeConfig } from "vite-plus";
import type { UserConfig, ViteDevServer } from "vite-plus";
import { createTargetConfigs, loadElectronConfig } from "./config.js";
import { createDevelopmentReporter, emitDevelopmentEvent } from "./dev-events.js";
import { DevelopmentLifecycleCoordinator } from "./dev-lifecycle.js";
import type { ProcessTarget } from "./dev-lifecycle.js";
import { ElectronRunner, printElectronRuntimeWarning, resolveElectronRuntime } from "./electron.js";
import type { ElectronProcessRunner } from "./electron.js";
import { electronHmrTracePlugin } from "./plugins/hmr-trace.js";
import type { DevOptions, DevServerHandle, DevServerHooks } from "./types.js";

interface CloseableWatcher {
  close(): Promise<void> | void;
}

interface BuildWatcher extends CloseableWatcher {
  on(event: "event", listener: (event: WatchEvent) => void): void;
}

type WatchEvent =
  | { code: "BUNDLE_START" }
  | { code: "BUNDLE_END"; duration: number }
  | { code: "ERROR"; error: unknown }
  | { code: string };

export async function startDevServer(
  options: DevOptions = {},
  hooks: DevServerHooks = {},
): Promise<DevServerHandle> {
  const resolved = await loadElectronConfig(options, "serve");
  printElectronRuntimeWarning(resolveElectronRuntime(resolved.root), options.logLevel);
  const targets = createTargetConfigs(resolved);
  if (!targets.main) throw new Error("The Electron main-process target is disabled.");
  if (!targets.renderer) throw new Error("The Electron renderer target is disabled.");

  const report = createDevelopmentReporter(Boolean(options.debugHmr), hooks.onDevelopmentEvent);
  let rendererServer: ViteDevServer | undefined;
  let runner: ElectronProcessRunner | undefined;
  let coordinator: DevelopmentLifecycleCoordinator | undefined;
  let closing = false;
  let shutdownPromise: Promise<void> | undefined;
  const watchers: CloseableWatcher[] = [];

  const signalHandler = (): void => {
    void shutdown(0);
  };

  async function shutdown(exitCode?: number): Promise<void> {
    if (shutdownPromise) return shutdownPromise;
    closing = true;
    process.off("SIGINT", signalHandler);
    process.off("SIGTERM", signalHandler);

    shutdownPromise = (async () => {
      const results = await Promise.allSettled([
        coordinator?.close(),
        runner?.stop(),
        rendererServer?.close(),
        ...watchers.map((watcher) => watcher.close()),
      ]);
      const failure = results.find(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );
      if (exitCode !== undefined) process.exitCode = exitCode;
      if (failure) throw failure.reason;
    })();
    return shutdownPromise;
  }

  try {
    coordinator = new DevelopmentLifecycleCoordinator({
      restartElectron: async () => {
        console.log("\n[electron-vite-plus] process targets rebuilt; restarting Electron");
        await runner?.restart();
        if (!closing) hooks.onMainRestart?.();
      },
      reloadRenderer: () => {
        console.log("\n[electron-vite-plus] preload rebuilt; reloading renderer");
        rendererServer?.hot.send({ type: "full-reload" });
        if (!closing) hooks.onPreloadReload?.();
      },
      onEvent: report,
      onError: (error) => {
        console.error(error);
        void shutdown(1);
      },
    });

    if (options.rendererOnly) {
      await buildProcessOnce(targets.main);
      if (targets.preload) await buildProcessOnce(targets.preload);
      console.log(
        "\n[electron-vite-plus] renderer-only mode; main and preload were built once and are not watched",
      );
    } else {
      watchers.push(await startWatchedBuild("main", targets.main, coordinator));
      if (targets.preload) {
        watchers.push(await startWatchedBuild("preload", targets.preload, coordinator));
      }
    }

    const traceRenderer = Boolean(options.debugHmr || hooks.onDevelopmentEvent);
    const rendererConfig = mergeConfig(targets.renderer, {
      plugins: traceRenderer ? [electronHmrTracePlugin(report)] : [],
      server: {
        ...(options.host ? { host: options.host } : {}),
        ...(options.port !== undefined ? { port: options.port } : {}),
      },
    });
    rendererServer = await createServer(rendererConfig);
    await rendererServer.listen();
    rendererServer.printUrls();

    const rendererUrl =
      rendererServer.resolvedUrls?.local[0] ?? rendererServer.resolvedUrls?.network[0];
    if (!rendererUrl) throw new Error("The renderer dev server did not expose a URL.");

    const createElectronRunner =
      hooks.createElectronRunner ?? ((runnerOptions) => new ElectronRunner(runnerOptions));
    runner = createElectronRunner({
      root: resolved.root,
      ...(options.electronArgs ? { args: options.electronArgs } : {}),
      env: { ELECTRON_RENDERER_URL: rendererUrl },
      onExit: (code, signal) => {
        if (!closing) void shutdown(code ?? (signal ? 1 : 0));
      },
      onError: (error) => {
        if (!closing) {
          console.error(error);
          void shutdown(1);
        }
      },
    });

    coordinator.activate();
    console.log("\n[electron-vite-plus] starting Electron");
    runner.start();
    emitDevelopmentEvent(report, { target: "lifecycle", phase: "ready" });
    process.once("SIGINT", signalHandler);
    process.once("SIGTERM", signalHandler);

    return {
      rendererUrl,
      close: () => shutdown(),
    };
  } catch (error) {
    await shutdown().catch((cleanupError: unknown) => console.error(cleanupError));
    throw error;
  }
}

async function buildProcessOnce(config: UserConfig): Promise<void> {
  await viteBuild(mergeConfig(config, { build: { watch: null } }));
}

async function startWatchedBuild(
  target: ProcessTarget,
  config: UserConfig,
  coordinator: DevelopmentLifecycleCoordinator,
): Promise<CloseableWatcher> {
  const watchOptions =
    config.build?.watch && typeof config.build.watch === "object" ? config.build.watch : {};
  const root = path.resolve(config.root ?? process.cwd());
  let nativeWatcher: BuildWatcher | undefined;
  let recoveryWatcher: FSWatcher | undefined;
  let recoveryWork: Promise<void> | undefined;
  let closed = false;

  const stopRecoveryWatcher = async (): Promise<void> => {
    const watcher = recoveryWatcher;
    recoveryWatcher = undefined;
    await watcher?.close();
  };

  const scheduleRecovery = (): void => {
    if (closed || recoveryWork) return;
    recoveryWork = (async () => {
      await stopRecoveryWatcher();
      await openNativeWatcher(false);
    })()
      .catch((error: unknown) => {
        if (!closed) {
          console.error(error);
          ensureRecoveryWatcher();
        }
      })
      .finally(() => {
        recoveryWork = undefined;
      });
  };

  const ensureRecoveryWatcher = (): void => {
    if (closed || recoveryWatcher) return;
    recoveryWatcher = watchFiles(root, {
      ignoreInitial: true,
      ignored: createRecoveryIgnore(config, root),
    });
    recoveryWatcher.on("add", scheduleRecovery);
    recoveryWatcher.on("error", (error) => console.error(error));
  };

  async function openNativeWatcher(startup: boolean): Promise<void> {
    await nativeWatcher?.close();
    nativeWatcher = undefined;
    if (!startup) coordinator.buildStarted(target);

    let firstBuild = true;
    let startedAt = performance.now();
    let resolveFirst: (() => void) | undefined;
    let rejectFirst: ((error: unknown) => void) | undefined;
    const firstResult = new Promise<void>((resolve, reject) => {
      resolveFirst = resolve;
      rejectFirst = reject;
    });

    const result = await viteBuild(mergeConfig(config, { build: { watch: watchOptions } }));
    if (!isWatcher(result)) {
      throw new Error(`The ${target} development build did not create a persistent watcher.`);
    }
    nativeWatcher = result;
    result.on("event", (event) => {
      if (event.code === "BUNDLE_START") {
        startedAt = performance.now();
        if (!firstBuild) coordinator.buildStarted(target);
        return;
      }
      if (event.code === "ERROR") {
        const durationMs = performance.now() - startedAt;
        if (firstBuild) {
          firstBuild = false;
          if (startup) {
            rejectFirst?.(event.error);
          } else {
            coordinator.buildFailed(target, event.error, durationMs);
            resolveFirst?.();
            ensureRecoveryWatcher();
          }
        } else {
          coordinator.buildFailed(target, event.error, durationMs);
          ensureRecoveryWatcher();
        }
        return;
      }
      if (event.code === "BUNDLE_END") {
        const durationMs = event.duration ?? performance.now() - startedAt;
        if (firstBuild) {
          firstBuild = false;
          if (!startup) coordinator.buildSucceeded(target, durationMs);
          resolveFirst?.();
        } else {
          coordinator.buildSucceeded(target, durationMs);
        }
        void stopRecoveryWatcher();
      }
    });

    try {
      await firstResult;
    } catch (error) {
      await result.close();
      nativeWatcher = undefined;
      throw error;
    }
  }

  await openNativeWatcher(true);
  return {
    async close(): Promise<void> {
      closed = true;
      await stopRecoveryWatcher();
      await recoveryWork;
      await nativeWatcher?.close();
      nativeWatcher = undefined;
    },
  };
}

function createRecoveryIgnore(config: UserConfig, root: string): (candidate: string) => boolean {
  const ignoredRoots = [path.join(root, ".git"), path.join(root, "node_modules")];
  if (config.build?.outDir) ignoredRoots.push(path.resolve(root, config.build.outDir));
  return (candidate) =>
    ignoredRoots.some(
      (ignoredRoot) =>
        candidate === ignoredRoot || candidate.startsWith(`${ignoredRoot}${path.sep}`),
    );
}

function isWatcher(value: unknown): value is BuildWatcher {
  return Boolean(value && typeof value === "object" && "close" in value && "on" in value);
}
