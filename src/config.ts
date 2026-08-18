import { builtinModules } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { loadConfigFromFile, mergeConfig, type InlineConfig, type UserConfig } from "vite-plus";
import type {
  CommonOptions,
  ElectronProcessConfig,
  ElectronVitePlusConfig,
  ProcessEntry,
  ResolvedElectronConfig,
} from "./types.js";

interface PackageData {
  type?: string;
  dependencies?: Record<string, string>;
}

export interface TargetConfigs {
  main?: InlineConfig;
  preload?: InlineConfig;
  renderer?: InlineConfig;
}

const entryExtensions = ["ts", "mts", "cts", "js", "mjs", "cjs"];

export async function loadElectronConfig(
  options: CommonOptions = {},
  command: "serve" | "build" = "build",
): Promise<ResolvedElectronConfig> {
  const root = path.resolve(options.root ?? process.cwd());
  const mode = options.mode ?? (command === "serve" ? "development" : "production");
  const result = await loadConfigFromFile(
    { command, mode, isSsrBuild: false, isPreview: false },
    options.configFile,
    root,
    options.logLevel,
  );

  const config = (result?.config ?? {}) as ElectronVitePlusConfig;
  if (!config.electron) {
    throw new Error(
      "Missing `electron` configuration in vite.config.ts. " +
        "Import defineConfig from electron-vite-plus and add an electron block.",
    );
  }

  const vite = extractRendererViteConfig(config);

  return {
    root,
    mode,
    ...(result?.path ? { configFile: result.path } : {}),
    vite,
    electron: {
      ...config.electron,
      ...(options.outDir ? { outDir: options.outDir } : {}),
    },
  };
}

export function createTargetConfigs(config: ResolvedElectronConfig): TargetConfigs {
  const { root, mode, electron } = config;
  const outDir = path.resolve(root, electron.outDir ?? "out");

  const targets: TargetConfigs = {};
  if (electron.main !== false) {
    targets.main = createNodeTargetConfig(root, mode, outDir, "main", electron.main ?? {});
  }
  if (electron.preload !== false) {
    const preloadEntry = resolveEntry(root, "preload", electron.preload?.entry);
    if (preloadEntry) {
      targets.preload = createNodeTargetConfig(
        root,
        mode,
        outDir,
        "preload",
        electron.preload ?? {},
      );
    }
  }
  if (electron.renderer !== false) {
    targets.renderer = createRendererTargetConfig(
      root,
      mode,
      outDir,
      config.vite,
      electron.renderer ?? {},
    );
  }

  return targets;
}

function createNodeTargetConfig(
  root: string,
  mode: string,
  outDir: string,
  target: "main" | "preload",
  processConfig: ElectronProcessConfig,
): InlineConfig {
  const entry = resolveEntry(root, target, processConfig.entry);
  if (!entry) {
    throw new Error(
      `No ${target} entry found. Add electron.${target}.entry or create src/${target}/index.ts.`,
    );
  }

  const packageData = readPackageData(root);
  const format =
    processConfig.format ??
    (target === "preload" ? "cjs" : packageData.type === "module" ? "es" : "cjs");
  const external = resolveExternals(packageData, processConfig.externalize);
  const extension = target === "preload" && format === "cjs" ? "cjs" : "js";
  const {
    entry: _entry,
    externalize: _externalize,
    format: _format,
    ...userConfig
  } = processConfig;

  const defaults: InlineConfig = {
    root,
    mode,
    configFile: false,
    publicDir: false,
    build: {
      outDir: path.join(outDir, target),
      target: "node20",
      minify: false,
      sourcemap: mode === "development",
      emptyOutDir: true,
      copyPublicDir: false,
      ssr: true,
      rolldownOptions: {
        input: entry,
        external,
        output: {
          format,
          entryFileNames: `[name].${extension}`,
          chunkFileNames: `chunks/[name]-[hash].${extension}`,
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
  };

  return mergeConfig(defaults, userConfig);
}

function createRendererTargetConfig(
  root: string,
  mode: string,
  outDir: string,
  baseConfig: UserConfig,
  rendererConfig: UserConfig,
): InlineConfig {
  const rendererRoot = path.resolve(root, rendererConfig.root ?? baseConfig.root ?? "src/renderer");
  const { root: _baseRoot, ...baseUserConfig } = baseConfig;
  const { root: _rendererRoot, ...rendererUserConfig } = rendererConfig;
  const defaults: InlineConfig = {
    root: rendererRoot,
    mode,
    configFile: false,
    base: "./",
    build: {
      outDir: path.join(outDir, "renderer"),
      emptyOutDir: true,
    },
  };
  const merged = mergeConfig(mergeConfig(defaults, baseUserConfig), rendererUserConfig);
  return {
    ...merged,
    root: rendererRoot,
    mode,
    configFile: false,
  };
}

function extractRendererViteConfig(config: ElectronVitePlusConfig): UserConfig {
  const vite = { ...config };
  delete vite.electron;
  delete vite.lint;
  delete vite.fmt;
  delete vite.check;
  delete vite.pack;
  delete vite.defaultPackage;
  delete vite.run;
  delete vite.staged;
  delete vite.create;
  delete vite.test;
  return vite;
}

function resolveEntry(
  root: string,
  target: "main" | "preload",
  explicit?: ProcessEntry,
): ProcessEntry | undefined {
  if (typeof explicit === "string") {
    return path.resolve(root, explicit);
  }
  if (explicit) {
    return Object.fromEntries(
      Object.entries(explicit).map(([name, entry]) => [name, path.resolve(root, entry)]),
    );
  }

  for (const basename of ["index", target]) {
    for (const extension of entryExtensions) {
      const candidate = path.join(root, "src", target, `${basename}.${extension}`);
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

function readPackageData(root: string): PackageData {
  const packagePath = path.join(root, "package.json");
  if (!existsSync(packagePath)) return {};
  return JSON.parse(readFileSync(packagePath, "utf8")) as PackageData;
}

function resolveExternals(
  packageData: PackageData,
  option: ElectronProcessConfig["externalize"] = true,
): Array<string | RegExp> {
  const nodeExternals = builtinModules.flatMap((name) => [name, `node:${name}`]);
  const alwaysExternal: Array<string | RegExp> = ["electron", /^electron\/.+/, ...nodeExternals];
  if (option === false) return alwaysExternal;

  const include = typeof option === "object" ? (option.include ?? []) : [];
  const exclude = new Set(typeof option === "object" ? (option.exclude ?? []) : []);
  const dependencies = [...Object.keys(packageData.dependencies ?? {}), ...include].filter(
    (dependency) => !exclude.has(dependency),
  );
  const uniqueDependencies = [...new Set(dependencies)];
  if (uniqueDependencies.length === 0) return alwaysExternal;

  const escaped = uniqueDependencies.map(escapeRegExp).join("|");
  return [...alwaysExternal, ...uniqueDependencies, new RegExp(`^(${escaped})/.+`)];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
