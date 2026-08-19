import type {
  ElectronVitePlusConfig,
  ElectronVitePlusConfigExport,
  ElectronVitePlusConfigFn,
} from "./types.js";

export { buildApp } from "./build.js";
export { startDevServer } from "./dev.js";
export { previewApp } from "./preview.js";
export { diagnoseProject, printDoctorReport } from "./doctor.js";
export type { DoctorReport, DoctorTarget } from "./doctor.js";
export { createTargetConfigs, loadElectronConfig } from "./config.js";
export type * from "./types.js";

export function defineConfig(config: ElectronVitePlusConfig): ElectronVitePlusConfig;
export function defineConfig(
  config: Promise<ElectronVitePlusConfig>,
): Promise<ElectronVitePlusConfig>;
export function defineConfig(config: ElectronVitePlusConfigFn): ElectronVitePlusConfigFn;
export function defineConfig(config: ElectronVitePlusConfigExport): ElectronVitePlusConfigExport;
export function defineConfig(config: ElectronVitePlusConfigExport): ElectronVitePlusConfigExport {
  return config;
}
