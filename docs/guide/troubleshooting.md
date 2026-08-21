# Troubleshooting

Start with the command that owns the failing layer. Preserve the exact exit code, signal, warning, and operating-system context before changing configuration.

## `doctor` succeeds but the app does not open

This is expected behavior, not a contradiction. `doctor` resolves configuration and diagnoses dependency setup. It does not compile output or launch Electron.

```bash
vp run doctor
vp run build
vp run smoke --skip-build
```

Use the first command that fails to narrow the problem. Read [runtime validation](./runtime-validation) for the full model.

## Preview reports a terminating signal

Example:

```text
[electron-vite-plus] Electron terminated by signal SIGABRT.
```

Preview returns a non-zero status for signal termination. Check Electron stderr and reproduce the same build outside restrictive containers or macOS sandboxes. If it launches there, preserve the signal as an environment constraint rather than treating preview as successful.

`SIGTERM` can also come from a supervisor or manual shutdown. Confirm who sent the signal before assigning the failure to application code.

## Smoke times out

The default 15-second timeout expired before the CLI saw `EVP_SMOKE_READY`.

Check that:

- main registers `electron-vite-plus:smoke-ready` when `ELECTRON_VITE_PLUS_SMOKE=1`;
- preload listens for the renderer event and forwards it over IPC;
- renderer dispatches readiness after real application initialization;
- the production window loads the built renderer HTML;
- preload paths and sandbox settings match the built output;
- startup is not legitimately longer than the selected `--timeout`.

Run `vp run preview -- --enable-logging` for interactive inspection. Increase the timeout only after confirming the handshake is reachable.

## Vite plugin compatibility warnings

If `doctor` warns about the Vite alias, the application should include:

```json
"vite": "npm:@voidzero-dev/vite-plus-core@0.2.9"
```

pnpm also needs `pnpm.overrides.vite` with the same alias and `pnpm.peerDependencyRules.allowAny` containing `vite`. The [migration guide](./migration#install-the-aligned-toolchain) has a complete package fragment.

## Sandboxed preload cannot resolve an asset

A sandboxed preload cannot import `node:path` or rely on `__dirname`. When it imports `?asset`, pass the application path from main through `additionalArguments`:

```ts
additionalArguments: [`--electron-vite-plus-app-path=${app.getAppPath()}`];
```

Generated applications include this value. See [process assets](./configuration#process-assets) for the complete `BrowserWindow` configuration.

Native modules and the WebAssembly filesystem loader are not sandbox-compatible. Move those operations to main or use an explicitly unsandboxed preload after reviewing the security impact.

## Renderer HMR feels delayed or reloads the whole page

Run the direct command with tracing enabled:

```bash
electron-vite-plus dev --debug-hmr
```

A successful hot update normally reports this sequence:

```text
renderer:file-change
renderer:hmr-send update
renderer:hmr-before-update update
renderer:hmr-after-update update <duration>
```

Use the last event reached to locate the boundary:

- no `file-change`: check whether the edited file belongs to the renderer module graph and whether the project is on a filesystem with reliable watch events;
- `file-change` without `hmr-send`: inspect renderer plugin errors and server logs;
- `hmr-send` without a client event: check `hmr-client-ready` and `hmr-ws-disconnect`, the renderer URL, proxy rules, and WebSocket connectivity;
- `hmr-before-full-reload`: Vite could not preserve the current module boundary; keep framework components in their own modules and avoid mixing incompatible exports with React Refresh boundaries;
- `hmr-before-update` without `hmr-after-update`: inspect the renderer console for an exception while evaluating the replacement module.

Edits to files imported by main or preload are process-target changes even when renderer code also imports them. The lifecycle coordinator waits for concurrent process builds and applies the strongest required action once. For a renderer-only work session, use `--renderer-only`; return to normal dev mode before testing process changes.

## A newer Electron major prints a fallback warning

The build clamps to the latest validated runtime targets so early testing can continue. The fallback is not a promise of support. Keep the warning visible in CI and follow the validation steps in [compatibility](./compatibility#missing-or-newer-electron-versions).

## Packaging, downloads, or signing fail

electron-builder downloads, Electron Forge configuration, Developer ID signing, notarization, and installer generation are downstream from electron-vite-plus. Confirm that `vp run build` and `vp run smoke` pass before debugging the packager.

Network download failures, signing credential prompts, SwiftPM cache permissions, and restricted Electron launch environments can fail a release pipeline without indicating a build-tool bug. The [packaging guide](./packaging) lists the handoff boundary and final-bundle checks.

## Report a reproducible bug

Include:

- a minimal project or public reproduction;
- Node.js, Electron, Vite+, and electron-vite-plus versions;
- package manager and operating system;
- `doctor` output;
- the failing command, exit code, and terminating signal;
- whether the same production output starts outside the failing environment.

Open a [bug report](https://github.com/FoundDream/electron-vite-plus/issues/new?template=bug_report.yml) after removing secrets and application-specific data.
