# Changelog

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
