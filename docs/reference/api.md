# Programmatic API

The package exposes the same core operations used by its CLI. This API is useful for advanced integrations and test harnesses; most applications should start with the CLI.

## `defineConfig`

Adds type inference to an Electron-aware Vite+ configuration.

```ts
import { defineConfig } from "electron-vite-plus";

export default defineConfig(({ mode }) => ({
  electron: {
    main: { entry: "src/main/index.ts" },
    renderer: { root: "src/renderer" },
  },
  define: {
    __APP_MODE__: JSON.stringify(mode),
  },
}));
```

## `buildApp(options?)`

Loads the configuration in build mode, resolves target configs, and builds every enabled target.

```ts
import { buildApp } from "electron-vite-plus";

await buildApp({
  root: "./apps/desktop",
  mode: "production",
  outDir: "out",
});
```

## `startDevServer(options?, hooks?)`

Starts the full development lifecycle and returns a handle with the renderer URL and an asynchronous `close()` method.

```ts
import { startDevServer } from "electron-vite-plus";

const server = await startDevServer({ port: 5174 });
console.log(server.rendererUrl);

await server.close();
```

Advanced integrations can provide hooks for custom Electron process creation and main/preload rebuild notifications.

## `previewApp(options?)`

Builds unless `skipBuild` is enabled, launches Electron, waits for it to exit, and resolves to the process exit code.

```ts
import { previewApp } from "electron-vite-plus";

const code = await previewApp({
  skipBuild: true,
  electronArgs: ["--enable-logging"],
});
```

## Configuration helpers

`loadElectronConfig(options?, command?)` resolves the Vite file and Electron block. `createTargetConfigs(config)` expands that resolved model into main, preload, and renderer Vite configurations.

`diagnoseProject(options?)` returns the same validation report used by the `doctor` command. `printDoctorReport(report)` renders it for a terminal.

The package also exports its public TypeScript interfaces, including `ElectronOptions`, `ElectronProcessConfig`, `DevOptions`, `PreviewOptions`, and `ResolvedElectronConfig`.

::: warning Alpha API
Programmatic exports are available, but their stability is not yet guaranteed during the Alpha line. Prefer the documented CLI where possible.
:::
