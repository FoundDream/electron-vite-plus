# Compatibility

The Alpha line pins a narrow toolchain so build output follows the runtime bundled with Electron instead of the Node.js version running the CLI.

## Supported versions

| Component           | Supported range                          |
| ------------------- | ---------------------------------------- |
| Node.js for the CLI | `^20.19.0`, `^22.18.0`, or `>=24.11.0`   |
| Electron            | `>=32 <44`                               |
| Vite+               | `>=0.2.9 <0.3.0`                         |
| Vite core alias     | `npm:@voidzero-dev/vite-plus-core@0.2.9` |

Pin `electron-vite-plus`, `vite-plus`, and the Vite core alias in application lockfiles. The Alpha API and compatibility surface can still change between releases.

## Runtime-derived build targets

electron-vite-plus reads the installed Electron version and selects the corresponding Node.js target for main and preload, plus the Chromium target for renderer.

| Electron | Node.js target | Chromium target |
| -------: | -------------- | --------------- |
|       32 | 20.16          | 128             |
|       33 | 20.18          | 130             |
|       34 | 20.18          | 132             |
|       35 | 22.14          | 134             |
|       36 | 22.14          | 136             |
|       37 | 22.16          | 138             |
|       38 | 22.19          | 140             |
|       39 | 22.20          | 142             |
|       40 | 24.11          | 144             |
|       41 | 24.14          | 146             |
|       42 | 24.15          | 148             |
|       43 | 24.17          | 150             |

This data is independent from configuration resolution, which makes target updates reviewable and testable without changing the build pipeline.

## Missing or newer Electron versions

When Electron is not installed in the application, the build uses the minimum supported runtime target and `doctor` prints a warning.

When the detected major is newer than the validated table, the build uses the latest known conservative targets and prints a warning. This fallback helps early compatibility testing. It does not expand the `>=32 <44` peer-support range and should not be interpreted as release support for a new Electron major.

Before adopting a newer major:

1. run `doctor` and preserve the fallback warning;
2. build all three targets;
3. run the runtime smoke check on every shipping operating system;
4. validate your packager, native modules, code signing, and application-specific Electron APIs;
5. wait for an electron-vite-plus release that explicitly expands the peer range before treating the combination as supported.

## Package manager compatibility

Renderer plugins commonly declare a peer dependency on `vite`. Applications must expose Vite+ core through that package name:

```json
{
  "devDependencies": {
    "vite": "npm:@voidzero-dev/vite-plus-core@0.2.9"
  }
}
```

pnpm users also need the override and `peerDependencyRules.allowAny` settings shown in the [migration guide](./migration#install-the-aligned-toolchain). `doctor` reports focused warnings when those fields are missing.
