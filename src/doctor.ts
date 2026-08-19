import path from "node:path";
import type { InlineConfig } from "vite-plus";
import { createTargetConfigs, loadElectronConfig } from "./config.js";
import { resolveElectronRuntime } from "./electron.js";
import type { CommonOptions } from "./types.js";

export interface DoctorTarget {
  name: "main" | "preload" | "renderer";
  root: string;
  outDir?: string;
  target?: string;
  format?: string;
}

export interface DoctorReport {
  root: string;
  configFile?: string;
  node: string;
  electron?: string;
  targets: DoctorTarget[];
  warnings: string[];
}

export async function diagnoseProject(options: CommonOptions = {}): Promise<DoctorReport> {
  const resolved = await loadElectronConfig(options, "build");
  const configs = createTargetConfigs(resolved);
  const runtime = resolveElectronRuntime(resolved.root);
  const targets = Object.entries(configs).flatMap(([name, config]) =>
    config ? [describeTarget(name as DoctorTarget["name"], config, resolved.root)] : [],
  );
  const warnings: string[] = [];
  if (!runtime.version) {
    warnings.push(
      "Electron is not installed in this project; build targets use the minimum supported runtime.",
    );
  }

  return {
    root: resolved.root,
    ...(resolved.configFile ? { configFile: resolved.configFile } : {}),
    node: process.version,
    ...(runtime.version ? { electron: runtime.version } : {}),
    targets,
    warnings,
  };
}

export function printDoctorReport(report: DoctorReport): void {
  console.log("electron-vite-plus doctor");
  console.log(`  project   ${report.root}`);
  console.log(`  config    ${report.configFile ?? "auto"}`);
  console.log(`  Node.js   ${report.node}`);
  console.log(`  Electron  ${report.electron ?? "not installed"}`);
  for (const target of report.targets) {
    const details = [target.target, target.format].filter(Boolean).join(", ");
    console.log(
      `  ${target.name.padEnd(9)}${target.outDir ?? "no output"}${details ? ` (${details})` : ""}`,
    );
  }
  for (const warning of report.warnings) console.warn(`  warning   ${warning}`);
  console.log("\nConfiguration is valid.");
}

function describeTarget(
  name: DoctorTarget["name"],
  config: InlineConfig,
  projectRoot: string,
): DoctorTarget {
  const root = path.resolve(config.root ?? projectRoot);
  const output = config.build?.rolldownOptions?.output;
  const firstOutput = Array.isArray(output) ? output[0] : output;
  const target = config.build?.target;

  return {
    name,
    root,
    ...(config.build?.outDir ? { outDir: path.resolve(root, config.build.outDir) } : {}),
    ...(typeof target === "string" ? { target } : {}),
    ...(firstOutput?.format ? { format: firstOutput.format } : {}),
  };
}
