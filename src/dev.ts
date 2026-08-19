import { watch as watchFiles } from "chokidar";
import type { FSWatcher } from "chokidar";
import path from "node:path";
import { createServer, build as viteBuild, mergeConfig } from "vite-plus";
import type { Plugin, UserConfig, ViteDevServer } from "vite-plus";
import { createTargetConfigs, loadElectronConfig } from "./config.js";
import { ElectronRunner, printElectronRuntimeWarning, resolveElectronRuntime } from "./electron.js";
import type { ElectronProcessRunner } from "./electron.js";
import type { DevOptions, DevServerHandle, DevServerHooks, ProcessEntry } from "./types.js";

interface Watcher {
  close(): Promise<void>;
}

export async function startDevServer(
  options: DevOptions = {},
  hooks: DevServerHooks = {},
): Promise<DevServerHandle> {
  const resolved = await loadElectronConfig(options, "serve");
  printElectronRuntimeWarning(resolveElectronRuntime(resolved.root), options.logLevel);
  const targets = createTargetConfigs(resolved);
  if (!targets.main) throw new Error("The Electron main-process target is disabled.");
  if (!targets.renderer) throw new Error("The Electron renderer target is disabled.");

  let rendererServer: ViteDevServer | undefined;
  let runner: ElectronProcessRunner | undefined;
  let closing = false;
  let shutdownPromise: Promise<void> | undefined;
  let restartTimer: NodeJS.Timeout | undefined;
  let restartWork: Promise<void> | undefined;
  let restartRequested = false;
  const watchers: Watcher[] = [];

  const signalHandler = (): void => {
    void shutdown(0);
  };

  async function shutdown(exitCode?: number): Promise<void> {
    if (shutdownPromise) return shutdownPromise;
    closing = true;
    restartRequested = false;
    if (restartTimer) clearTimeout(restartTimer);
    process.off("SIGINT", signalHandler);
    process.off("SIGTERM", signalHandler);

    shutdownPromise = (async () => {
      await restartWork?.catch(() => undefined);
      const results = await Promise.allSettled([
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

  const requestRestart = (): void => {
    if (closing) return;
    restartRequested = true;
    if (restartWork) return;

    restartWork = (async () => {
      while (restartRequested && !closing) {
        restartRequested = false;
        console.log("\n[electron-vite-plus] main rebuilt; restarting Electron");
        await runner?.restart();
        if (!closing) hooks.onMainRestart?.();
      }
    })()
      .catch((error: unknown) => {
        console.error(error);
        void shutdown(1);
      })
      .finally(() => {
        restartWork = undefined;
        if (restartRequested && !closing) requestRestart();
      });
  };

  const scheduleRestart = (): void => {
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = setTimeout(requestRestart, 80);
  };

  const handleWatcherError = (error: unknown): void => {
    console.error(error);
    void shutdown(1);
  };

  try {
    const mainWatcher = await startWatchedBuild(targets.main, scheduleRestart, handleWatcherError);
    watchers.push(mainWatcher);

    if (targets.preload) {
      const preloadWatcher = await startWatchedBuild(
        targets.preload,
        () => {
          console.log("\n[electron-vite-plus] preload rebuilt; reloading renderer");
          rendererServer?.ws.send({ type: "full-reload" });
          hooks.onPreloadReload?.();
        },
        handleWatcherError,
      );
      watchers.push(preloadWatcher);
    }

    const rendererConfig = mergeConfig(targets.renderer, {
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

    console.log("\n[electron-vite-plus] starting Electron");
    runner.start();
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

async function startWatchedBuild(
  config: UserConfig,
  onRebuild: () => void,
  onFatalError: (error: unknown) => void,
): Promise<Watcher> {
  let fileWatcher: FSWatcher | undefined;
  let watchedFiles = new Set<string>();
  let activeBuild: Promise<void> | undefined;
  let buildTimer: NodeJS.Timeout | undefined;
  let pendingBuild = false;
  let closed = false;
  let hasBuilt = false;
  let buildFailed = false;
  const watchRoots = resolveWatchRoots(config);

  const runBuild = async (): Promise<void> => {
    const nextWatchedFiles = new Set<string>();
    const collectModulesPlugin: Plugin = {
      name: "electron-vite-plus:collect-modules",
      transform(_code, id) {
        const filename = id.split("?", 1)[0];
        if (!filename || !path.isAbsolute(filename)) return;
        if (filename.includes(`${path.sep}node_modules${path.sep}`)) return;
        nextWatchedFiles.add(filename);
      },
    };
    const buildConfig = hasBuilt
      ? mergeConfig(config, { build: { emptyOutDir: false }, plugins: [collectModulesPlugin] })
      : mergeConfig(config, { plugins: [collectModulesPlugin] });

    await viteBuild(buildConfig);
    hasBuilt = true;
    if (closed) return;
    updateWatchedFiles(
      new Set([
        ...watchRoots,
        ...[...nextWatchedFiles].filter((filename) => !isInsideAny(filename, watchRoots)),
      ]),
    );
  };

  const updateWatchedFiles = (nextWatchedFiles: Set<string>): void => {
    if (fileWatcher) {
      const additions = [...nextWatchedFiles].filter((filename) => !watchedFiles.has(filename));
      const removals = [...watchedFiles].filter((filename) => !nextWatchedFiles.has(filename));
      if (additions.length > 0) fileWatcher.add(additions);
      if (removals.length > 0) void fileWatcher.unwatch(removals);
    }
    watchedFiles = nextWatchedFiles;
  };

  const scheduleBuild = (): void => {
    if (closed) return;
    if (buildTimer) clearTimeout(buildTimer);
    buildTimer = setTimeout(queueBuild, 60);
  };

  const queueBuild = (): void => {
    buildTimer = undefined;
    if (closed) return;
    pendingBuild = true;
    if (activeBuild) return;

    activeBuild = drainBuilds().finally(() => {
      activeBuild = undefined;
      if (pendingBuild && !closed) scheduleBuild();
    });
  };

  const drainBuilds = async (): Promise<void> => {
    while (pendingBuild && !closed) {
      pendingBuild = false;
      try {
        await runBuild();
        if (buildFailed) console.log("\n[electron-vite-plus] build recovered");
        buildFailed = false;
        if (!closed) onRebuild();
      } catch (error) {
        buildFailed = true;
        console.error("\n[electron-vite-plus] build failed; watching for a fix");
        console.error(error);
      }
    }
  };

  await runBuild();
  if (watchedFiles.size === 0) {
    updateWatchedFiles(watchRoots);
  }
  if (watchedFiles.size === 0) {
    throw new Error("The build completed without discovering any local modules to watch.");
  }

  fileWatcher = watchFiles([...watchedFiles], {
    ignoreInitial: true,
    ignored: (filename) => filename.includes(`${path.sep}node_modules${path.sep}`),
    awaitWriteFinish: {
      stabilityThreshold: 50,
      pollInterval: 10,
    },
  });
  fileWatcher.on("add", scheduleBuild);
  fileWatcher.on("change", scheduleBuild);
  fileWatcher.on("unlink", scheduleBuild);
  fileWatcher.on("error", onFatalError);

  return {
    async close() {
      closed = true;
      pendingBuild = false;
      if (buildTimer) clearTimeout(buildTimer);
      await fileWatcher?.close();
      await activeBuild;
    },
  };
}

function resolveWatchRoots(config: UserConfig): Set<string> {
  const root = path.resolve(config.root ?? process.cwd());
  const input = config.build?.rolldownOptions?.input as ProcessEntry | string[] | undefined;
  const entries =
    typeof input === "string"
      ? [input]
      : Array.isArray(input)
        ? input
        : input
          ? Object.values(input)
          : [];
  return new Set(entries.map((entry) => path.dirname(path.resolve(root, entry))));
}

function isInsideAny(filename: string, directories: Set<string>): boolean {
  for (const directory of directories) {
    const relative = path.relative(directory, filename);
    if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) return true;
  }
  return false;
}
