# Getting started

electron-vite-plus connects Electron's three execution environments to the Vite+ toolchain. The fastest path is to scaffold an application, install it with Vite+, and start the development loop.

::: warning Alpha software
The current release is intended for early testing. Pin versions in real projects and review the [current scope](./alpha-scope) before adopting it.
:::

## Prerequisites

- Node.js `20.19+`, `22.18+`, or `24.11+`
- Electron `32` or newer
- Vite+ `0.2.x`

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
    "preview": "electron-vite-plus preview",
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
vp run preview
```

The production build is written to `out/` by default. Preview builds first, then launches Electron against the result.

## Next steps

- Understand the [three-target build model](./build-model).
- Tune entries, output, and dependency handling in [configuration](./configuration).
- See every available [CLI option](../reference/commands).
