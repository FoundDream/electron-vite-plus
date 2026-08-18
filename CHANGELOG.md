# Changelog

## 0.1.0-alpha.0

- Build Electron main, preload, and renderer targets through Vite+.
- Run renderer HMR, main-process restart, and preload reload in development.
- Inherit top-level Vite plugins and configuration in the renderer target.
- Externalize Electron, Node.js built-ins, and application dependencies.
- Add vanilla, React, and Vue build fixtures.
- Add `create-electron-vite-plus` with vanilla, React, and Vue templates.
