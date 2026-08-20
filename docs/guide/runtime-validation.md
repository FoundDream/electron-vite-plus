# Runtime validation

A resolved configuration is useful evidence, but it does not prove that Electron can start or that the renderer and preload scripts load. electron-vite-plus separates those checks so failures point to the right layer.

## The three gates

| Gate     | Command         | What it proves                                                                | What it does not prove                         |
| -------- | --------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| Diagnose | `vp run doctor` | Configuration loads and the dependency setup can be inspected.                | Bundles compile or Electron starts.            |
| Produce  | `vp run build`  | Every enabled target compiles into its configured output directory.           | The built application reaches runtime startup. |
| Prove    | `vp run smoke`  | Main, preload, and renderer complete an explicit runtime readiness handshake. | Installer, signing, or packaged-app behavior.  |

Run the gates in that order when diagnosing a migration. In CI, run `doctor` and `build` on every supported operating system, then run `smoke` where an Electron display session is available.

## Diagnose the project

```bash
vp run doctor
```

`doctor` loads the build configuration and reports:

- the project root and selected config file;
- the installed Node.js and Electron versions;
- the resolved target, format, and output path for main, preload, and renderer;
- a missing or incompatible Vite core alias;
- pnpm override and peer-dependency settings required by renderer plugins.

The final line is deliberately explicit:

```text
Configuration resolved successfully. Runtime startup was not checked.
```

Use `doctor` for setup and compatibility problems. Do not use its success message as an application health check.

## Inspect the production runtime

```bash
vp run preview
```

`preview` builds first, launches Electron from the application root, and returns the Electron process status. Use `--skip-build` when you intentionally want to inspect an existing output tree.

If Electron exits because of `SIGABRT`, `SIGTERM`, or another signal, preview prints the signal and returns a non-zero status. A signal termination is never converted into a successful exit.

Preview is useful for interactive inspection. It keeps running until the application exits and does not require a readiness hook.

## Prove runtime readiness

```bash
vp run smoke
vp run smoke --skip-build --timeout 10000
```

Smoke sets `ELECTRON_VITE_PLUS_SMOKE=1`, launches the production application, and waits for `EVP_SMOKE_READY`. Generated projects already include the three-part handshake:

1. renderer dispatches `electron-vite-plus:renderer-ready` after application initialization;
2. preload forwards the event over Electron IPC;
3. main prints `EVP_SMOKE_READY` after receiving it.

The default timeout is 15 seconds. Smoke returns a non-zero status when Electron exits early, is terminated by a signal, or does not emit the marker before the timeout. It stops Electron after a successful check.

See the exact integration code in the [`smoke` command reference](../reference/commands#smoke).

## A practical CI sequence

```bash
vp install
vp check
vp test
vp run doctor
vp run build
vp run smoke --skip-build
```

The final command requires an environment where Electron can launch. A container or macOS sandbox can terminate Electron even when the application is valid, so preserve the reported signal and reproduce the same build outside that restriction before assigning ownership.

Packaging remains a separate downstream gate. Read the [packaging guide](./packaging) before treating smoke success as release readiness.
