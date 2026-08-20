# Migrate an existing Electron app

Migration is successful when the application builds and its real main, preload, and renderer entries complete the runtime smoke handshake. Move one layer at a time and keep the old build path available until the production output is verified.

## Install the aligned toolchain

Pin the Alpha packages together. Vite plugins still request the `vite` package name, so alias it to the Vite+ core implementation.

```json
{
  "devDependencies": {
    "electron-vite-plus": "0.1.0-alpha.1",
    "vite": "npm:@voidzero-dev/vite-plus-core@0.2.9",
    "vite-plus": "0.2.9"
  },
  "pnpm": {
    "overrides": {
      "vite": "npm:@voidzero-dev/vite-plus-core@0.2.9"
    },
    "peerDependencyRules": {
      "allowAny": ["vite"]
    }
  }
}
```

The pnpm fields keep the full dependency graph on Vite+ core and acknowledge the conventional Vite peer declared by renderer plugins. Generated projects include these settings automatically.

## Add application scripts

Point Electron at the compiled main entry and expose each validation stage through Vite+.

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

Keep your current package module type if changing it would alter application semantics. Configure the main output format explicitly when needed.

## Describe the three entries

```ts
import { defineConfig } from "electron-vite-plus";

export default defineConfig({
  electron: {
    main: { entry: "src/main/index.ts" },
    preload: { entry: "src/preload/index.ts" },
    renderer: { root: "src/renderer" },
  },
});
```

Top-level Vite plugins and web options flow into the renderer. Main and preload use Electron-aware Node targets, formats, and dependency externalization. Read [configuration](./configuration) before migrating custom Rollup output or native dependencies.

## Preserve development and production loading

The main process should load the renderer development URL only when it is present, then fall back to the built HTML file.

```ts
if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
  await window.loadURL(process.env.ELECTRON_RENDERER_URL);
} else {
  await window.loadFile(path.join(import.meta.dirname, "../renderer/index.html"));
}
```

For a sandboxed preload that imports `?asset`, pass the application path without importing Node modules inside preload:

```ts
new BrowserWindow({
  webPreferences: {
    contextIsolation: true,
    sandbox: true,
    preload: path.join(import.meta.dirname, "../preload/index.cjs"),
    additionalArguments: [`--electron-vite-plus-app-path=${app.getAppPath()}`],
  },
});
```

## Add the readiness handshake

Copy the main, preload, and renderer hooks from the [`smoke` command reference](../reference/commands#smoke). Emit renderer readiness after your real application initialization, not at module import time if startup is asynchronous.

The handshake is active only when `ELECTRON_VITE_PLUS_SMOKE=1`, so it does not change normal production behavior.

## Migration acceptance checks

Run each check separately and stop at the first failing layer:

```bash
vp run doctor
vp check
vp test
vp run build
vp run preview
vp run smoke --skip-build
```

A migration is ready for downstream packaging when:

- `doctor` reports the intended Electron version, formats, targets, and output paths;
- `out/main`, `out/preload`, and `out/renderer` contain the expected production entries;
- preview preserves any crash signal as a failure;
- smoke reaches the real renderer initialization through preload and main;
- the previous packager can consume the new output without silently changing signing, native-module, or resource behavior.

Compare against a newly generated project when setup warnings are unclear. The scaffold is the executable reference for the current Alpha release.
