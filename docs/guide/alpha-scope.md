# Alpha scope

The Alpha release validates the core build and development architecture. It is useful for experiments and early application work, but it is deliberately smaller than a complete Electron distribution toolchain.

## Included today

- one `vite.config.ts` for Vite+ and Electron;
- main, preload, and renderer production builds;
- renderer HMR;
- main-process rebuild and restart;
- preload rebuild and renderer reload;
- Electron-aware output formats and dependency externalization;
- Electron-version-derived Node.js and Chromium targets;
- main/preload asset, native-module, and WebAssembly path handling;
- serialized Electron restarts and failed-rebuild recovery;
- vanilla, React, and Vue project templates;
- `dev`, `build`, `preview`, `smoke`, and `doctor` commands;
- automated build coverage across macOS, Windows, and Linux;
- a macOS main/preload/renderer readiness smoke test;
- conservative build-target fallback and CI coverage for the next Electron beta.

## Not included yet

- Electron Forge or electron-builder integration;
- installer or application bundle generation;
- code signing and notarization;
- worker import conventions;
- bytecode protection;
- dedicated native-module integration tests.

Vite+ provides the underlying package-manager rebuild workflow, but electron-vite-plus does not yet add a native Electron module lifecycle on top of it.

## Adoption guidance

Pin `electron-vite-plus`, `vite-plus`, and the aliased Vite core version together. Validate production output on every operating system you plan to ship, and keep packaging/signing as an explicit downstream step.

If you hit a problem, open a [bug report](https://github.com/FoundDream/electron-vite-plus/issues/new?template=bug_report.yml) with a minimal reproduction and the relevant Electron, Vite+, Node.js, and operating-system versions.

Before adopting the Alpha in an existing application, review [compatibility](./compatibility), follow the [migration checks](./migration#migration-acceptance-checks), and keep [packaging](./packaging) as an explicit downstream gate.
