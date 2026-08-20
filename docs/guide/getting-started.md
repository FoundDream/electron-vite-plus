# Getting started

electron-vite-plus connects Electron's three execution environments to the Vite+ toolchain. The fastest path is to scaffold an application, install it with Vite+, and start the development loop.

::: warning Alpha software
Version `0.1.0-alpha.1` is intended for early testing. Pin versions in real projects and review the [current scope](./alpha-scope) before adopting it.
:::

## Prerequisites

- Node.js `20.19+`, `22.18+`, or `24.11+`
- Electron `32` through `43` for this Alpha
- Vite+ `0.2.x`

Newer Electron majors use the latest validated conservative build targets with a warning. That fallback supports early compatibility testing but does not expand the published peer-support range.

Vite+ ships the global `vp` command separately from the local `vite-plus`
package. Install `vp` before creating a project:

::: code-group

```bash [macOS / Linux]
curl -fsSL https://vite.plus | bash
```

```powershell [Windows]
irm https://vite.plus/ps1 | iex
```

:::

Open a new shell and run `vp help` to confirm the installation. See the
[official Vite+ installation guide](https://viteplus.dev/guide/) for platform
details and alternative installers.

## Create an application

Choose `vanilla`, `react`, or `vue`:

```bash
npm create electron-vite-plus@alpha my-app -- --template react
cd my-app
vp install
vp run dev
```

The generated project already includes the package scripts, Vite compatibility override, and a working Electron entry for each target.

## Project anatomy

```text
my-app/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main/
    │   └── index.ts
    ├── preload/
    │   └── index.ts
    └── renderer/
        ├── index.html
        └── src/
```

`package.json` points Electron at the compiled main entry:

```json
{
  "type": "module",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite-plus dev",
    "build": "electron-vite-plus build",
    "doctor": "electron-vite-plus doctor",
    "preview": "electron-vite-plus preview",
    "smoke": "electron-vite-plus smoke",
    "check": "vp check"
  }
}
```

## Your first configuration

The renderer inherits standard Vite options from the top level. Electron-specific target options live under `electron`.

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite-plus";

export default defineConfig({
  plugins: [react()],
  electron: {
    main: { entry: "src/main/index.ts" },
    preload: { entry: "src/preload/index.ts" },
    renderer: { root: "src/renderer" },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
```

## Run the loop

```bash
vp run dev
```

During development:

1. main-process changes rebuild that target and restart Electron;
2. preload changes rebuild the bridge and trigger a renderer reload;
3. renderer changes use the Vite dev server and HMR.

The renderer URL is passed to the Electron process as `ELECTRON_RENDERER_URL`. Read it in your main entry when creating the browser window:

```ts
if (process.env.ELECTRON_RENDERER_URL) {
  await window.loadURL(process.env.ELECTRON_RENDERER_URL);
} else {
  await window.loadFile("out/renderer/index.html");
}
```

## Build and inspect

```bash
vp check
vp test
vp run build
vp run doctor
vp run preview
vp run smoke
```

The production build is written to `out/` by default. Preview builds first, then launches Electron against the result. Smoke waits for the generated renderer entry and preload bridge to complete the readiness handshake, then shuts Electron down.

## Next steps

- Understand the [three-target build model](./build-model).
- Learn what [doctor, build, preview, and smoke](./runtime-validation) each prove.
- Follow the [migration guide](./migration) when adopting an existing application.
- Tune entries, output, and dependency handling in [configuration](./configuration).
- Review [compatibility](./compatibility) and the downstream [packaging boundary](./packaging).
- See every available [CLI option](../reference/commands).
