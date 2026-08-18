import type { ConfigEnv, UserConfig } from "vite-plus";
import type { ElectronProcessRunner, ElectronRunnerOptions } from "./electron.js";

export interface ExternalizeOptions {
  include?: string[];
  exclude?: string[];
}

export type ProcessEntry = string | Record<string, string>;

export interface ElectronProcessConfig extends UserConfig {
  /** Entry file or named entry map for the Electron process. */
  entry?: ProcessEntry;
  /** Externalize package.json dependencies by default. */
  externalize?: boolean | ExternalizeOptions;
  /** Output module format. Main defaults from package.json; preload defaults to CJS. */
  format?: "es" | "cjs";
}

export interface ElectronRendererConfig extends UserConfig {}

export interface ElectronOptions {
  /** Electron main-process build. */
  main?: ElectronProcessConfig | false;
  /** Electron preload-script build. */
  preload?: ElectronProcessConfig | false;
  /** Chromium renderer build/dev server. */
  renderer?: ElectronRendererConfig | false;
  /** Base output directory. Defaults to `out`. */
  outDir?: string;
}

export interface ElectronVitePlusConfig extends UserConfig {
  electron?: ElectronOptions;
}

export type ElectronVitePlusConfigFn = (
  env: ConfigEnv,
) => ElectronVitePlusConfig | Promise<ElectronVitePlusConfig>;

export type ElectronVitePlusConfigExport =
  | ElectronVitePlusConfig
  | Promise<ElectronVitePlusConfig>
  | ElectronVitePlusConfigFn;

export interface CommonOptions {
  root?: string;
  configFile?: string;
  mode?: string;
  outDir?: string;
  logLevel?: "info" | "warn" | "error" | "silent";
}

export interface DevOptions extends CommonOptions {
  host?: string;
  port?: number;
  electronArgs?: string[];
}

export interface DevServerHandle {
  rendererUrl: string;
  close(): Promise<void>;
}

export interface DevServerHooks {
  /** Override Electron process creation for advanced integrations and tests. */
  createElectronRunner?: (options: ElectronRunnerOptions) => ElectronProcessRunner;
  onMainRestart?: () => void;
  onPreloadReload?: () => void;
}

export interface PreviewOptions extends CommonOptions {
  skipBuild?: boolean;
  electronArgs?: string[];
}

export interface ResolvedElectronConfig {
  root: string;
  mode: string;
  configFile?: string;
  /** Top-level Vite configuration inherited by the renderer target. */
  vite: UserConfig;
  electron: ElectronOptions;
}
