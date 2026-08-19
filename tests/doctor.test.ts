import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { diagnoseProject, printDoctorReport } from "../src/doctor.js";

describe("electron-vite-plus doctor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("accepts the generated Vite+ and pnpm dependency setup", async () => {
    const root = createDoctorApp({
      packageManager: "pnpm@10.34.0",
      devDependencies: {
        vite: "npm:@voidzero-dev/vite-plus-core@0.2.9",
        "vite-plus": "0.2.9",
      },
      pnpm: {
        overrides: { vite: "npm:@voidzero-dev/vite-plus-core@0.2.9" },
        peerDependencyRules: { allowAny: ["vite"] },
      },
    });

    try {
      const report = await diagnoseProject({ root, logLevel: "silent" });
      expect(report.warnings).toEqual([
        "Electron is not installed in this project; build targets use the minimum supported runtime.",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("explains missing Vite+ pnpm compatibility settings", async () => {
    const root = createDoctorApp({
      packageManager: "pnpm@10.34.0",
      devDependencies: { vite: "^8.0.0", "vite-plus": "0.2.9" },
      pnpm: {},
    });

    try {
      const report = await diagnoseProject({ root, logLevel: "silent" });
      expect(report.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('alias "vite"'),
          expect.stringContaining("pnpm.overrides.vite"),
          expect.stringContaining("pnpm.peerDependencyRules.allowAny"),
        ]),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("states that doctor does not validate runtime startup", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    printDoctorReport({
      root: "/project",
      node: process.version,
      targets: [],
      warnings: [],
    });

    expect(log).toHaveBeenLastCalledWith(
      "\nConfiguration resolved successfully. Runtime startup was not checked.",
    );
  });
});

function createDoctorApp(packageData: Record<string, unknown>): string {
  const root = mkdtempSync(path.join(tmpdir(), "electron-vite-plus-doctor-"));
  mkdirSync(path.join(root, "src/main"), { recursive: true });
  mkdirSync(path.join(root, "src/renderer"), { recursive: true });
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "doctor-fixture", private: true, type: "module", ...packageData }),
  );
  writeFileSync(
    path.join(root, "vite.config.ts"),
    'export default { electron: { main: { entry: "src/main/index.ts" }, preload: false, renderer: { root: "src/renderer" } } };',
  );
  writeFileSync(path.join(root, "src/main/index.ts"), "export {};\n");
  writeFileSync(path.join(root, "src/renderer/index.html"), "<!doctype html><html></html>\n");
  return root;
}
