# Configuration

Import `defineConfig` from `electron-vite-plus` so a single `vite.config.ts` can describe both the renderer's standard Vite behavior and Electron's build targets.

```ts
import { defineConfig } from "electron-vite-plus";

export default defineConfig({
  electron: {
    main: {},
    preload: {},
    renderer: {},
    outDir: "out",
  },
});
```

The helper accepts an object, a promise, or a configuration function with the usual Vite `ConfigEnv` argument.

## `electron.outDir`

Base output directory for all targets. Defaults to `out`.

```ts
electron: {
  outDir: "artifacts",
}
```

This produces `artifacts/main`, `artifacts/preload`, and `artifacts/renderer`.

The CLI `--out-dir` option overrides the configured value for one invocation.

## `electron.main`

Configures the Electron main process. It accepts the shared process options plus standard Vite user configuration.

| Option        | Type                               | Behavior                                                                     |
| ------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| `entry`       | `string \| Record<string, string>` | Entry file or a named entry map. Defaults to discovering `src/main/index.*`. |
| `format`      | `"es" \| "cjs"`                    | Output module format. Defaults from the application's `package.json` type.   |
| `externalize` | `boolean \| ExternalizeOptions`    | Externalize application dependencies. Defaults to `true`.                    |

### Named entries

```ts
electron: {
  main: {
    entry: {
      index: "src/main/index.ts",
      worker: "src/main/worker.ts",
    },
  },
}
```

### Dependency handling

```ts
electron: {
  main: {
    externalize: {
      include: ["package-kept-at-runtime"],
      exclude: ["package-bundled-into-main"],
    },
  },
}
```

Setting `externalize: false` bundles application dependencies where possible, but still leaves Electron and Node built-ins external.

Both `dependencies` and `optionalDependencies` are externalized by default. The Node.js target is derived from the Electron version installed in the application, so generated code does not accidentally require a newer runtime.

### Process assets

Main and preload code can emit a file and receive its runtime path:

```ts
import iconPath from "./icon.png?asset";
```

Use `?asset&asarUnpack` for files that a packager will place beside `app.asar`, import native `.node` modules directly, or use `?loader` with a WebAssembly file. Add `electron-vite-plus/client` to `compilerOptions.types` when TypeScript does not load the declarations automatically.

Files under `resources/` are referenced in place and are not copied into each process output. Include that directory in your downstream Electron packager configuration.

Sandboxed preload scripts cannot import `node:path` or use `__dirname`. When a preload imports `?asset`, pass the application path through Electron's documented `additionalArguments` bridge. Generated projects already include this setting:

```ts
new BrowserWindow({
  webPreferences: {
    preload: path.join(import.meta.dirname, "../preload/index.cjs"),
    sandbox: true,
    additionalArguments: [`--electron-vite-plus-app-path=${app.getAppPath()}`],
  },
});
```

electron-vite-plus uses that value to produce an app-relative asset path without loading Node.js modules inside the sandbox.

Electron's sandbox only exposes a small module subset to preload code. Native modules and the WebAssembly filesystem loader therefore require an unsandboxed preload or the main process; `?asset` path generation itself remains sandbox-compatible.

## `electron.preload`

Uses the same options as `electron.main`. Its discovered entry is `src/preload/index.*`, and its format defaults to CommonJS for compatibility with Electron preload loading.

```ts
electron: {
  preload: {
    entry: "src/preload/index.ts",
    format: "cjs",
  },
}
```

Output extensions follow both the selected format and the application's `package.json` type, preventing Node.js from interpreting ESM as CommonJS or vice versa. CommonJS preload entry files use `.cjs`.

## `electron.renderer`

Accepts standard Vite user configuration. `root` defaults to the top-level Vite root or `src/renderer`.

```ts
export default defineConfig({
  plugins: [frameworkPlugin()],
  electron: {
    renderer: {
      root: "src/renderer",
      build: {
        sourcemap: true,
      },
    },
  },
});
```

Top-level Vite configuration is inherited by the renderer. Vite+ task namespaces such as `lint`, `fmt`, `check`, `pack`, `run`, and `test` are excluded before the renderer configuration is passed to Vite.

The renderer target is derived from the Chromium version bundled with the installed Electron release.

Environment files are loaded from the project root. Main, preload, and renderer accept `MAIN_VITE_`, `PRELOAD_VITE_`, and `RENDERER_VITE_` respectively, while all three also accept the standard `VITE_` prefix. Only put values safe for renderer code behind renderer-visible prefixes.

## Disable a target

Set a target to `false` when an application does not need it:

```ts
electron: {
  main: { entry: "src/main/index.ts" },
  preload: false,
  renderer: { root: "src/renderer" },
}
```

The `dev` command requires both main and renderer targets. Preload is optional. Production builds skip any target set to `false`.

## Modes and config files

Use standard CLI switches to select another mode or configuration file:

```bash
electron-vite-plus build --mode staging
electron-vite-plus build --config vite.desktop.config.ts
```

The default mode is `development` for `dev` and `production` for `build` and `preview`.
