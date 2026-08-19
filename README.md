# electron-vite-plus

Electron build tooling powered by Vite+.

[Documentation](https://electron-vite-plus.com/) · [Getting started](https://electron-vite-plus.com/guide/getting-started) · [Configuration](https://electron-vite-plus.com/guide/configuration)

> Experimental Alpha. This project is independent from Electron, electron-vite,
> and VoidZero. It is inspired by the workflow of
> [electron-vite](https://github.com/alex8088/electron-vite) and uses the public
> Vite APIs exported by [Vite+](https://viteplus.dev/).

## Why

Vite+ unifies the JavaScript runtime, package manager, formatting, linting,
testing, builds, and task caching. Electron additionally needs coordinated
builds for its main process, preload scripts, and Chromium renderer.
electron-vite-plus connects those two layers.

The Alpha provides:

- one `vite.config.ts` for Vite+ and Electron;
- Vite+ builds for main, preload, and renderer;
- renderer HMR;
- main-process restart and preload reload during development;
- Electron-aware defaults for output formats and external dependencies;
- Electron-aware asset imports and runtime-derived build targets;
- `dev`, `build`, `preview`, and `doctor` commands that can be run through `vp run`.

## Create a project

```bash
npm create electron-vite-plus@alpha my-app -- --template react
cd my-app
vp install
vp run dev
```

The project generator includes `vanilla`, `react`, and `vue` templates.

## Configuration

```ts
// vite.config.ts
import { defineConfig } from "electron-vite-plus";

export default defineConfig({
  // Standard Vite plugins and options are inherited by the renderer.
  plugins: [],
  electron: {
    main: {
      entry: "src/main/index.ts",
    },
    preload: {
      entry: "src/preload/index.ts",
    },
    renderer: {
      root: "src/renderer",
    },
  },

  // Native Vite+ configuration remains in the same file.
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
```

Expected project layout:

```text
src/
├── main/index.ts
├── preload/index.ts
└── renderer/index.html
```

Add scripts to the Electron application's `package.json`:

```json
{
  "type": "module",
  "packageManager": "pnpm@10.34.0",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite-plus dev",
    "build": "electron-vite-plus build",
    "doctor": "electron-vite-plus doctor",
    "preview": "electron-vite-plus preview"
  },
  "devDependencies": {
    "electron": "^43.4.0",
    "electron-vite-plus": "0.1.0-alpha.0",
    "vite-plus": "0.2.9",
    "vite": "npm:@voidzero-dev/vite-plus-core@0.2.9"
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

The exact `vite` override follows the Vite+ setup and lets renderer plugins
resolve the Vite 8 API supplied by Vite+. The peer rule accounts for the
independent `0.x` version used by the Vite+ core package.

Run it directly or through the Vite+ task runner:

```bash
vp run dev
vp check
vp test
vp run build
vp run preview
```

## Commands

```text
electron-vite-plus [dev] [root]
electron-vite-plus build [root]
electron-vite-plus preview [root]
electron-vite-plus doctor [root]
```

Use `electron-vite-plus --help` for all options. `evp` is provided as a short
alias.

## Current scope

This Alpha validates the core architecture and is intended for early testing.
It does not yet include Electron Forge/electron-builder integration, code
signing, worker import conventions, or bytecode protection. Vite+ provides the
underlying package-manager `rebuild` workflow, but native Electron modules do
not yet have dedicated integration tests here.

The automated suite covers vanilla, React, and Vue production builds, asset
emission, process lifecycle behavior, rebuild recovery, and preload reloads. CI
runs on macOS, Windows, and Linux.
