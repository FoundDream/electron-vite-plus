# CLI commands

The `electron-vite-plus` binary is also available through the shorter `evp` alias.

## Usage

```text
electron-vite-plus [dev] [root] [options] [-- electron-args]
electron-vite-plus build [root] [options]
electron-vite-plus preview [root] [options] [-- electron-args]
```

When the first positional value is not a known command, the CLI treats it as the application root and runs `dev`.

## Commands

### `dev`

Starts watched main and preload builds, the renderer dev server, and Electron. This is the default command.

```bash
electron-vite-plus dev
electron-vite-plus ./apps/desktop --port 5174
```

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

## Options

| Option                | Commands | Description                               |
| --------------------- | -------- | ----------------------------------------- |
| `-c, --config <file>` | all      | Use a specific Vite config file.          |
| `-m, --mode <mode>`   | all      | Set the Vite mode.                        |
| `--out-dir <dir>`     | all      | Override the base output directory.       |
| `--host <host>`       | dev      | Set the renderer dev-server host.         |
| `--port <port>`       | dev      | Set the renderer dev-server port.         |
| `--skip-build`        | preview  | Launch the existing production build.     |
| `--log-level <level>` | all      | Use `info`, `warn`, `error`, or `silent`. |
| `-h, --help`          | all      | Print usage information.                  |
| `-v, --version`       | all      | Print the installed version.              |

## Pass arguments to Electron

Arguments after `--` are forwarded to the Electron executable during development and preview:

```bash
electron-vite-plus dev -- --enable-logging
electron-vite-plus preview -- --trace-warnings
```

## Vite+ scripts

A generated application exposes the CLI through package scripts, so the full local workflow stays inside the Vite+ runner:

```bash
vp run dev
vp check
vp test
vp run build
vp run preview
```

Run `electron-vite-plus --help` against your installed version when scripting options for CI.
