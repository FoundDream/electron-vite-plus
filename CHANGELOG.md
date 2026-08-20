# Changelog

## Unreleased

## 0.1.0-alpha.1

- Return a non-zero status and report the terminating signal when Electron exits abnormally during `preview`.
- Add a `smoke` command with an explicit main/preload/renderer readiness handshake and timeout handling.
- Diagnose Vite+ aliases and pnpm peer compatibility settings through `doctor`.
- Use conservative build targets with a warning when a newer Electron major is detected.
- Keep emitted asset paths compatible with sandboxed CommonJS preload scripts.

## 0.1.0-alpha.0

- Build Electron main, preload, and renderer targets through Vite+.
- Run renderer HMR, main-process restart, and preload reload in development.
- Inherit top-level Vite plugins and configuration in the renderer target.
- Externalize Electron, Node.js built-ins, and application dependencies.
- Derive main/preload and renderer build targets from the installed Electron runtime.
- Emit main/preload assets and provide Electron-specific client module declarations.
- Serialize Electron restarts, recover failed development rebuilds, and roll back failed startup.
- Validate entries, output directories, CLI options, and project setup through `doctor`.
- Add target-specific environment prefixes for main, preload, and renderer code.
- Add vanilla, React, and Vue build fixtures.
- Add `create-electron-vite-plus` with vanilla, React, and Vue templates.
