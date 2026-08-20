# How the build works

An Electron application is not one bundle. It is a coordinated set of programs with different runtime constraints. electron-vite-plus resolves one configuration into three target-specific Vite builds.

## Target matrix

| Target   | Runtime                   | Default source            | Default output  | Default format                                |
| -------- | ------------------------- | ------------------------- | --------------- | --------------------------------------------- |
| Main     | Node.js + Electron        | `src/main/index.*`        | `out/main/`     | `es` when the package is ESM, otherwise `cjs` |
| Preload  | Electron isolated context | `src/preload/index.*`     | `out/preload/`  | `cjs`                                         |
| Renderer | Chromium                  | `src/renderer/index.html` | `out/renderer/` | Vite web build                                |

Entry discovery checks TypeScript and JavaScript variants of `index` and the target name. Explicit `entry` values always win.

## Main and preload

Both Node-oriented targets use a server-side Vite build. Their Node.js target is derived from the Electron version installed in the application. They keep source maps in development, skip minification by default, and do not copy a public directory. See the [compatibility table](./compatibility#runtime-derived-build-targets) for the current mapping.

electron-vite-plus always externalizes:

- the `electron` package and subpaths;
- Node.js built-in modules, including `node:` specifiers.

Application dependencies are externalized by default so native and runtime-sensitive modules remain available to Electron as installed packages. You can change that behavior per target.

```ts
electron: {
  main: {
    externalize: {
      include: ["runtime-only-package"],
      exclude: ["bundle-this-package"],
    },
  },
}
```

## Renderer

The renderer starts from the non-Vite+ fields in the top-level configuration, then merges `electron.renderer` over them. This means familiar Vite plugins and web options stay where ecosystem tools expect them.

```ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@ui": "/src/renderer/src" },
  },
  electron: {
    renderer: {
      root: "src/renderer",
      // Renderer-only options override top-level Vite options.
      build: { sourcemap: true },
    },
  },
});
```

The renderer base defaults to `./`, making its asset URLs suitable for Electron's file-based production load.

## Development lifecycle

The `dev` command starts watched builds for main and preload, starts the renderer dev server, then launches the Electron executable installed by the application.

```text
main change     → rebuild main    → restart Electron
preload change  → rebuild preload → full renderer reload
renderer change → Vite HMR        → update the web surface
```

Restarts are briefly debounced so a single source edit does not produce a burst of Electron processes. On shutdown, electron-vite-plus closes file watchers, the dev server, and the Electron child process.

## Production, preview, and smoke

`build` runs enabled targets and writes them under the shared output directory. `preview` performs that build unless `--skip-build` is set, then launches Electron using the application's package root.

This preview is a runtime check of the compiled application. It is not an installer, signer, or distributable-package preview.

`smoke` goes one step further: renderer code emits a readiness event after application initialization, preload forwards it over IPC, and main prints the marker observed by the CLI. A process that merely starts, crashes before loading preload, or never runs the renderer entry fails through its exit status or the readiness timeout.

Use the [runtime validation guide](./runtime-validation) to choose the right command for local development and CI. When the output is ready to ship, continue with the separate [packaging and distribution](./packaging) stage.
