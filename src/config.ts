import { builtinModules } from "node:module";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { loadConfigFromFile, mergeConfig, type InlineConfig, type UserConfig } from "vite-plus";
import { resolveElectronRuntime } from "./electron.js";
import { electronAssetPlugin, electronEsmShimPlugin } from "./plugins/electron-assets.js";
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
  optionalDependencies?: Record<string, string>;
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

  validateOutputDirectories(root, targets);

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
  const runtime = resolveElectronRuntime(root);
  const format =
    processConfig.format ??
    (target === "preload" ? "cjs" : packageData.type === "module" ? "es" : "cjs");
  if (format !== "es" && format !== "cjs") {
    throw new Error(`Electron ${target} format must be "es" or "cjs".`);
  }
  const external = resolveExternals(packageData, processConfig.externalize);
  const extension = resolveOutputExtension(target, format, packageData.type);
  const publicDir = resolvePublicDir(root, processConfig.publicDir);
  const targetOutDir = path.join(outDir, target);
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
    envDir: root,
    envPrefix: target === "main" ? ["MAIN_VITE_", "VITE_"] : ["PRELOAD_VITE_", "VITE_"],
    publicDir,
    plugins: [
      electronAssetPlugin({ format, outDir: targetOutDir, publicDir }),
      electronEsmShimPlugin(),
    ],
    build: {
      outDir: targetOutDir,
      target: runtime.nodeTarget,
      minify: false,
      sourcemap: mode === "development",
      emptyOutDir: true,
      copyPublicDir: false,
      modulePreload: false,
      ssr: true,
      ssrEmitAssets: true,
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

  const targetConfig = mergeConfig(defaults, userConfig);
  validateBuildTarget(target, targetConfig.build?.target);
  validateProcessOutputFormat(target, targetConfig, format);
  return targetConfig;
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
    envDir: root,
    envPrefix: ["RENDERER_VITE_", "VITE_"],
    build: {
      outDir: path.join(outDir, "renderer"),
      target: resolveElectronRuntime(root).chromeTarget,
      emptyOutDir: true,
    },
  };
  const merged = mergeConfig(mergeConfig(defaults, baseUserConfig), rendererUserConfig);
  const target: InlineConfig = {
    ...merged,
    root: rendererRoot,
    mode,
    configFile: false,
  };
  validateRendererInput(target);
  validateBuildTarget("renderer", target.build?.target);
  return target;
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
    return validateEntry(target, path.resolve(root, explicit));
  }
  if (explicit) {
    const entries = Object.entries(explicit);
    if (entries.length === 0) {
      throw new Error(`electron.${target}.entry must contain at least one entry.`);
    }
    return Object.fromEntries(
      entries.map(([name, entry]) => [name, validateEntry(target, path.resolve(root, entry))]),
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
  const dependencies = [
    ...Object.keys(packageData.dependencies ?? {}),
    ...Object.keys(packageData.optionalDependencies ?? {}),
    ...include,
  ].filter((dependency) => !exclude.has(dependency));
  const uniqueDependencies = [...new Set(dependencies)];
  if (uniqueDependencies.length === 0) return alwaysExternal;

  const escaped = uniqueDependencies.map(escapeRegExp).join("|");
  return [...alwaysExternal, ...uniqueDependencies, new RegExp(`^(${escaped})/.+`)];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveOutputExtension(
  target: "main" | "preload",
  format: "es" | "cjs",
  packageType: string | undefined,
): "js" | "mjs" | "cjs" {
  if (format === "es") return packageType === "module" ? "js" : "mjs";
  return target === "preload" || packageType === "module" ? "cjs" : "js";
}

function validateEntry(target: "main" | "preload", entry: string): string {
  if (!existsSync(entry)) {
    throw new Error(`Electron ${target} entry does not exist: ${entry}`);
  }
  if (!statSync(entry).isFile()) {
    throw new Error(`Electron ${target} entry is not a file: ${entry}`);
  }
  return entry;
}

function resolvePublicDir(root: string, configured: UserConfig["publicDir"]): string | false {
  if (configured === false) return false;
  return path.resolve(root, configured ?? "resources");
}

function validateOutputDirectories(root: string, targets: TargetConfigs): void {
  const seen: Array<{ name: string; output: string }> = [];
  for (const [name, config] of Object.entries(targets)) {
    if (!config) continue;
    const configured = config.build?.outDir;
    if (!configured) continue;
    const output = path.resolve(config.root ?? root, configured);
    const projectFromOutput = path.relative(output, root);
    if (
      projectFromOutput === "" ||
      (!projectFromOutput.startsWith("..") && !path.isAbsolute(projectFromOutput))
    ) {
      throw new Error(
        `Electron ${name} output directory must not contain the project root: ${output}`,
      );
    }
    const previous = seen.find((entry) => pathsOverlap(entry.output, output));
    if (previous) {
      throw new Error(
        `Electron targets ${previous.name} and ${name} resolve to overlapping output directories: ${previous.output} and ${output}`,
      );
    }
    seen.push({ name, output });
  }
}

function pathsOverlap(first: string, second: string): boolean {
  const relative = path.relative(first, second);
  if (relative === "") return true;
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) return true;
  const reverse = path.relative(second, first);
  return !reverse.startsWith("..") && !path.isAbsolute(reverse);
}

function validateRendererInput(config: InlineConfig): void {
  const root = path.resolve(config.root ?? process.cwd());
  const input = config.build?.rolldownOptions?.input;
  if (!input) {
    const indexHtml = path.join(root, "index.html");
    if (!existsSync(indexHtml)) {
      throw new Error(
        `No renderer entry found. Create ${indexHtml} or set electron.renderer.build.rolldownOptions.input.`,
      );
    }
    return;
  }

  const entries =
    typeof input === "string"
      ? [input]
      : Array.isArray(input)
        ? input
        : Object.values(input).flat();
  for (const entry of entries) {
    validateEntryPath("renderer", path.resolve(root, entry));
  }
}

function validateEntryPath(target: "renderer", entry: string): void {
  if (!existsSync(entry)) {
    throw new Error(`Electron ${target} entry does not exist: ${entry}`);
  }
  if (!statSync(entry).isFile()) {
    throw new Error(`Electron ${target} entry is not a file: ${entry}`);
  }
}

function validateBuildTarget(
  processTarget: "main" | "preload" | "renderer",
  configured: unknown,
): void {
  const targets = Array.isArray(configured) ? configured : [configured];
  const validPattern =
    processTarget === "renderer"
      ? /^(?:chrome\d+(?:\.\d+)?|es(?:20\d{2}|next))$/
      : /^node\d+(?:\.\d+)?$/;
  if (
    targets.length === 0 ||
    targets.some((target) => typeof target !== "string" || !validPattern.test(target))
  ) {
    throw new Error(
      `Electron ${processTarget} build.target must use ${
        processTarget === "renderer" ? "a chrome* or es* target" : "a node* target"
      }.`,
    );
  }
}

function validateProcessOutputFormat(
  processTarget: "main" | "preload",
  config: InlineConfig,
  expected: "es" | "cjs",
): void {
  const output = config.build?.rolldownOptions?.output;
  if (Array.isArray(output)) {
    throw new Error(`Electron ${processTarget} does not support multiple output formats.`);
  }
  if (output?.format && output.format !== expected) {
    throw new Error(
      `Electron ${processTarget} output format must match electron.${processTarget}.format (${expected}).`,
    );
  }
}
