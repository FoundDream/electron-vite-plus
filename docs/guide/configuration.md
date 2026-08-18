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

CommonJS preload entry files are emitted with a `.cjs` extension.

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
