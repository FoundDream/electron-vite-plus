# Packaging and distribution

electron-vite-plus produces application code. It does not currently produce installers, sign binaries, notarize macOS applications, or manage a packager-specific native-module lifecycle.

## Where the boundary sits

```text
source
  → electron-vite-plus build
  → out/main + out/preload + out/renderer
  → your Electron packager
  → application bundle or installer
  → signing and platform distribution
```

You can keep an existing electron-builder or Electron Forge configuration after migration. Point it at the application package whose `main` field resolves to the built main entry, and include the complete output tree.

## Downstream checklist

Your packaging layer remains responsible for:

- including `out/main`, `out/preload`, and `out/renderer`;
- including application dependencies that stay external to the main or preload bundle;
- rebuilding native modules for the packaged Electron version;
- placing `resources/` where application code expects it;
- unpacking files that cannot run from inside `app.asar`;
- application metadata, icons, installers, signing, and notarization;
- validating the final installed application on each target operating system.

## Assets and ASAR

Import a main or preload asset with `?asset` to receive its runtime path:

```ts
import iconPath from "./icon.png?asset";
```

Use `?asset&asarUnpack` for a file that your packager will place beside `app.asar`:

```ts
import executablePath from "./helper.bin?asset&asarUnpack";
```

The query expresses the runtime path contract. You still need matching packager configuration so the file is copied and unpacked in the expected location.

Files under `resources/` are referenced in place rather than copied into every target output. Include that directory in the packager explicitly.

## Native modules and WebAssembly

Application dependencies are externalized by default so runtime-sensitive modules remain installed beside the application. Direct `.node` imports and the WebAssembly filesystem loader require an unsandboxed preload or the main process because Electron's sandboxed preload exposes only a limited module subset.

Vite+ supplies the underlying package-manager rebuild workflow. electron-vite-plus does not yet coordinate that workflow with a specific Electron packager.

## Release validation

Use two different runtime gates:

1. run `vp run smoke` against the production output before packaging;
2. launch and test the final application bundle or installer after packaging.

The first gate proves the built main, preload, and renderer can reach application readiness. The second catches missing files, ASAR layout errors, native ABI mismatches, entitlements, signing, and operating-system policy failures.

See [Alpha scope](./alpha-scope) for the current product boundary and [troubleshooting](./troubleshooting) for common environment failures.
