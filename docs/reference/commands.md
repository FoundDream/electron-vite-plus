# CLI commands

The `electron-vite-plus` binary is also available through the shorter `evp` alias.

## Usage

```text
electron-vite-plus [dev] [root] [options] [-- electron-args]
electron-vite-plus build [root] [options]
electron-vite-plus preview [root] [options] [-- electron-args]
electron-vite-plus smoke [root] [options] [-- electron-args]
electron-vite-plus doctor [root] [options]
```

When the first positional value is not a known command, the CLI treats it as the application root and runs `dev`.

## Commands

### `dev`

Starts watched main and preload builds, the renderer dev server, and Electron. This is the default command.

```bash
electron-vite-plus dev
electron-vite-plus ./apps/desktop --port 5174
electron-vite-plus dev --debug-hmr
electron-vite-plus dev --renderer-only
```

Main and preload use persistent Vite+ build watchers. Concurrent rebuilds are coordinated so a shared-file change produces one Electron lifecycle action: a main restart takes precedence over a preload-only renderer reload.

`--renderer-only` builds main and preload once before launch, then watches only the renderer. Use it while working exclusively on renderer code; changes to main or preload are intentionally ignored until the normal dev command is restarted.

`--debug-hmr` prints structured renderer and process lifecycle events, including renderer file detection, server dispatch, client receipt/application, full reloads, WebSocket state, process-target build duration, reload, and restart.

### `build`

Builds every enabled target into the configured output directory.

```bash
electron-vite-plus build
electron-vite-plus build ./apps/desktop --mode staging
```

### `preview`

Builds the application and launches Electron against the production output. Pass `--skip-build` to reuse an existing build.

```bash
electron-vite-plus preview
electron-vite-plus preview --skip-build
```

If Electron exits because of a signal, `preview` reports the signal and returns a non-zero status.

### `smoke`

Builds the application, launches Electron with `ELECTRON_VITE_PLUS_SMOKE=1`, and waits for the preload/renderer readiness handshake. Generated projects include the handshake. Use `--timeout` to change the default 15-second deadline and `--skip-build` to validate an existing build.

```bash
electron-vite-plus smoke
electron-vite-plus smoke --skip-build --timeout 10000
```

For a manually migrated application, register the handshake in main and preload:

```ts
// main
if (process.env.ELECTRON_VITE_PLUS_SMOKE === "1") {
  ipcMain.once("electron-vite-plus:smoke-ready", () => console.log("EVP_SMOKE_READY"));
}

// preload
if (process.env.ELECTRON_VITE_PLUS_SMOKE === "1") {
  window.addEventListener(
    "electron-vite-plus:renderer-ready",
    () => ipcRenderer.send("electron-vite-plus:smoke-ready"),
    { once: true },
  );
}

// renderer, after application initialization
window.dispatchEvent(new Event("electron-vite-plus:renderer-ready"));
```

### `doctor`

Loads and validates the project configuration, then prints the resolved Electron version, build targets, formats, output directories, and dependency-compatibility warnings without building or launching the application.

```bash
electron-vite-plus doctor
```

## Options

| Option                | Commands       | Description                                           |
| --------------------- | -------------- | ----------------------------------------------------- |
| `-c, --config <file>` | all            | Use a specific Vite config file.                      |
| `-m, --mode <mode>`   | all            | Set the Vite mode.                                    |
| `--out-dir <dir>`     | all            | Override the base output directory.                   |
| `--host <host>`       | dev            | Set the renderer dev-server host.                     |
| `--port <port>`       | dev            | Set the renderer dev-server port.                     |
| `--renderer-only`     | dev            | Build process targets once, then watch renderer only. |
| `--debug-hmr`         | dev            | Trace HMR and Electron lifecycle timing.              |
| `--skip-build`        | preview, smoke | Reuse the existing production build.                  |
| `--timeout <ms>`      | smoke          | Set the readiness timeout in milliseconds.            |
| `--log-level <level>` | all            | Use `info`, `warn`, `error`, or `silent`.             |
| `-h, --help`          | all            | Print usage information.                              |
| `-v, --version`       | all            | Print the installed version.                          |

## Pass arguments to Electron

Arguments after `--` are forwarded to the Electron executable during development, preview, and smoke:

```bash
electron-vite-plus dev -- --enable-logging
electron-vite-plus preview -- --trace-warnings
electron-vite-plus smoke -- --disable-gpu
```

## Vite+ scripts

A generated application exposes the CLI through package scripts, so the full local workflow stays inside the Vite+ runner:

```bash
vp run dev
vp check
vp test
vp run build
vp run preview
vp run smoke
```

Run `electron-vite-plus --help` against your installed version when scripting options for CI.
