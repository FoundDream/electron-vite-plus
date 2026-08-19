import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { createProject, templates } from "../packages/create-electron-vite-plus/src/index.js";

describe("create-electron-vite-plus", () => {
  test("creates complete vanilla, React, and Vue projects", () => {
    const temporaryRoot = mkdtempSync(path.join(tmpdir(), "create-electron-vite-plus-"));

    try {
      for (const template of templates) {
        const target = path.join(temporaryRoot, `My ${template} App`);
        createProject({ directory: target, template });

        const packageData = JSON.parse(readFileSync(path.join(target, "package.json"), "utf8")) as {
          name: string;
          packageManager: string;
          scripts: Record<string, string>;
          devDependencies: Record<string, string>;
          pnpm: {
            overrides: Record<string, string>;
            peerDependencyRules: { allowAny: string[] };
          };
        };
        expect(packageData.name).toBe(`my-${template}-app`);
        expect(packageData.packageManager).toBe("pnpm@10.34.0");
        expect(packageData.scripts.dev).toBe("electron-vite-plus dev");
        expect(packageData.scripts.doctor).toBe("electron-vite-plus doctor");
        expect(packageData.scripts.smoke).toBe("electron-vite-plus smoke");
        expect(packageData.devDependencies.electron).toBe("^43.4.0");
        expect(packageData.devDependencies["vite-plus"]).toBe("0.2.9");
        expect(packageData.devDependencies.vite).toBe("npm:@voidzero-dev/vite-plus-core@0.2.9");
        expect(packageData.pnpm.overrides.vite).toBe("npm:@voidzero-dev/vite-plus-core@0.2.9");
        expect(packageData.pnpm.peerDependencyRules.allowAny).toContain("vite");
        expect(existsSync(path.join(target, ".gitignore"))).toBe(true);
        expect(existsSync(path.join(target, "src/main/index.ts"))).toBe(true);
        expect(existsSync(path.join(target, "src/preload/index.ts"))).toBe(true);
        expect(existsSync(path.join(target, "src/renderer/index.html"))).toBe(true);
        expect(readFileSync(path.join(target, "src/main/index.ts"), "utf8")).toContain(
          'ipcMain.once("electron-vite-plus:smoke-ready"',
        );
        expect(readFileSync(path.join(target, "src/preload/index.ts"), "utf8")).toContain(
          'ipcRenderer.send("electron-vite-plus:smoke-ready")',
        );
        const rendererSources = [
          path.join(target, "src/renderer/src.ts"),
          path.join(target, "src/renderer/src/main.tsx"),
          path.join(target, "src/renderer/src/main.ts"),
        ];
        const rendererEntry = rendererSources.find((filename) => existsSync(filename));
        if (!rendererEntry) throw new Error(`No renderer entry generated for ${template}`);
        expect(readFileSync(rendererEntry, "utf8")).toContain(
          'new Event("electron-vite-plus:renderer-ready")',
        );
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  test("refuses to overwrite a non-empty directory", () => {
    const target = mkdtempSync(path.join(tmpdir(), "create-electron-vite-plus-nonempty-"));
    mkdirSync(path.join(target, "keep"));
    writeFileSync(path.join(target, "keep/data.txt"), "preserve me");

    try {
      expect(() => createProject({ directory: target })).toThrow("Target directory is not empty");
      expect(readFileSync(path.join(target, "keep/data.txt"), "utf8")).toBe("preserve me");
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});
