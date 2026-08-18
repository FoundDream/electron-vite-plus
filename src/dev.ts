import { watch as watchFiles } from "chokidar";
import type { FSWatcher } from "chokidar";
import path from "node:path";
import { createServer, build as viteBuild, mergeConfig } from "vite-plus";
import type { Plugin, UserConfig, ViteDevServer } from "vite-plus";
import { createTargetConfigs, loadElectronConfig } from "./config.js";
import { ElectronRunner } from "./electron.js";
import type { ElectronProcessRunner } from "./electron.js";
import type { DevOptions, DevServerHandle, DevServerHooks } from "./types.js";

interface Watcher {
  close(): Promise<void>;
}

export async function startDevServer(
  options: DevOptions = {},
  hooks: DevServerHooks = {},
): Promise<DevServerHandle> {
  const resolved = await loadElectronConfig(options, "serve");
  const targets = createTargetConfigs(resolved);
  if (!targets.main) throw new Error("The Electron main-process target is disabled.");
  if (!targets.renderer) throw new Error("The Electron renderer target is disabled.");

  let rendererServer: ViteDevServer | undefined;
  let runner: ElectronProcessRunner | undefined;
  let closing = false;
  let restartTimer: NodeJS.Timeout | undefined;
  const watchers: Watcher[] = [];

  const scheduleRestart = (): void => {
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      if (!runner) return;
      console.log("\n[electron-vite-plus] main rebuilt; restarting Electron");
      void runner
        .restart()
        .then(() => hooks.onMainRestart?.())
        .catch((error: unknown) => {
          console.error(error);
          void shutdown(1);
        });
    }, 80);
  };

  const mainWatcher = await startWatchedBuild(targets.main, scheduleRestart);
  watchers.push(mainWatcher);

  if (targets.preload) {
    const preloadWatcher = await startWatchedBuild(targets.preload, () => {
      console.log("\n[electron-vite-plus] preload rebuilt; reloading renderer");
      rendererServer?.ws.send({ type: "full-reload" });
      hooks.onPreloadReload?.();
    });
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
    onExit: (code) => {
      if (!closing) void shutdown(code ?? 0);
    },
  });

  console.log("\n[electron-vite-plus] starting Electron");
  runner.start();

  const signalHandler = (): void => {
    void shutdown(0);
  };
  process.once("SIGINT", signalHandler);
  process.once("SIGTERM", signalHandler);

  async function shutdown(exitCode?: number): Promise<void> {
    if (closing) return;
    closing = true;
    if (restartTimer) clearTimeout(restartTimer);
    process.off("SIGINT", signalHandler);
    process.off("SIGTERM", signalHandler);
    await runner?.stop();
    await rendererServer?.close();
    await Promise.all(watchers.map((watcher) => watcher.close()));
    if (exitCode !== undefined) process.exitCode = exitCode;
  }

  return {
    rendererUrl,
    close: () => shutdown(),
  };
}

async function startWatchedBuild(config: UserConfig, onRebuild: () => void): Promise<Watcher> {
  let fileWatcher: FSWatcher | undefined;
  let watchedFiles = new Set<string>();
  let activeBuild: Promise<void> | undefined;
  let pendingBuild = false;
  let closed = false;

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

    await viteBuild(mergeConfig(config, { plugins: [collectModulesPlugin] }));
    if (closed) return;
    updateWatchedFiles(nextWatchedFiles);
  };

  const updateWatchedFiles = (nextWatchedFiles: Set<string>): void => {
    if (fileWatcher) {
      const additions = [...nextWatchedFiles].filter((filename) => !watchedFiles.has(filename));
      const removals = [...watchedFiles].filter((filename) => !nextWatchedFiles.has(filename));
      if (additions.length > 0) fileWatcher.add(additions);
      if (removals.length > 0) fileWatcher.unwatch(removals);
    }
    watchedFiles = nextWatchedFiles;
  };

  const scheduleBuild = (): void => {
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
        if (!closed) onRebuild();
      } catch (error) {
        console.error(error);
      }
    }
  };

  await runBuild();
  if (watchedFiles.size === 0) {
    throw new Error("The build completed without discovering any local modules to watch.");
  }

  fileWatcher = watchFiles([...watchedFiles], {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 50,
      pollInterval: 10,
    },
  });
  fileWatcher.on("change", scheduleBuild);
  fileWatcher.on("unlink", scheduleBuild);
  fileWatcher.on("error", (error) => console.error(error));

  return {
    async close() {
      closed = true;
      pendingBuild = false;
      await fileWatcher?.close();
      await activeBuild;
    },
  };
}
