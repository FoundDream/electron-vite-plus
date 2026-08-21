import { readFile } from "node:fs/promises";
import path from "node:path";
import MagicString from "magic-string";
import type { Plugin } from "vite-plus";

interface ElectronAssetPluginOptions {
  root: string;
  target: "main" | "preload";
  format: "es" | "cjs";
  outDir: string;
  publicDir: string | false;
}

interface EmittedAsset {
  placeholder: string;
  referenceId: string;
}

interface PublicAsset {
  placeholder: string;
  filename: string;
}

/** Resolve Electron main/preload assets to paths relative to their emitted chunks. */
export function electronAssetPlugin(options: ElectronAssetPluginOptions): Plugin {
  let emittedAssets: EmittedAsset[] = [];
  let publicAssets: PublicAsset[] = [];
  let nextPlaceholderId = 0;

  return {
    name: "electron-vite-plus:assets",
    apply: "build",
    enforce: "pre",
    buildStart() {
      emittedAssets = [];
      publicAssets = [];
      nextPlaceholderId = 0;
    },
    async load(id) {
      if (id.startsWith("\0")) return;

      const filename = cleanUrl(id);
      const query = id.includes("?") ? id.slice(id.indexOf("?") + 1) : "";
      const params = new URLSearchParams(query);
      const isAsset = params.has("asset");
      const isNativeModule = filename.endsWith(".node");
      const isWasmLoader = filename.endsWith(".wasm") && params.has("loader");
      if (!isAsset && !isNativeModule && !isWasmLoader) return;

      this.addWatchFile(filename);
      const placeholder = `__EVP_NODE_ASSET_${nextPlaceholderId++}__`;
      if (options.publicDir && isInside(options.publicDir, filename)) {
        publicAssets.push({ placeholder, filename });
      } else {
        const source = await readFile(filename);
        const referenceId = this.emitFile({
          type: "asset",
          name: path.basename(filename),
          source,
        });
        emittedAssets.push({ placeholder, referenceId });
      }

      if (isNativeModule) {
        return `export default require(${JSON.stringify(placeholder)});`;
      }
      if (isWasmLoader) {
        const runtimePath = createRuntimePath(options, placeholder);
        const pathImport = options.format === "es" ? 'import { join } from "node:path";' : "";
        return `
          import { readFile } from "node:fs/promises";
          ${pathImport}
          export default async function loadWasm(imports = {}) {
            const source = await readFile(${runtimePath});
            const result = await WebAssembly.instantiate(source, imports);
            return result.instance;
          }
        `;
      }

      const runtimePath = createRuntimePath(options, placeholder);
      const pathImport = options.format === "es" ? 'import { join } from "node:path"; ' : "";
      return params.has("asarUnpack")
        ? `${pathImport}export default ${runtimePath}.replace("app.asar", "app.asar.unpacked");`
        : `${pathImport}export default ${runtimePath};`;
    },
    renderChunk(code, chunk, outputOptions) {
      let transformed: MagicString | undefined;
      const replacePlaceholder = (placeholder: string, replacement: string): void => {
        let index = code.indexOf(placeholder);
        while (index !== -1) {
          transformed ??= new MagicString(code);
          transformed.overwrite(index, index + placeholder.length, replacement, {
            contentOnly: true,
          });
          index = code.indexOf(placeholder, index + placeholder.length);
        }
      };

      for (const asset of emittedAssets) {
        const emittedFilename = this.getFileName(asset.referenceId);
        const outputRoot = outputOptions.dir ?? options.outDir;
        const relativePath =
          options.target === "preload"
            ? normalizeRelativePath(
                path.relative(options.root, path.resolve(outputRoot, emittedFilename)),
              )
            : toRelativePath(chunk.fileName, emittedFilename);
        replacePlaceholder(asset.placeholder, relativePath);
      }
      for (const asset of publicAssets) {
        if (!options.publicDir) continue;
        const outputRoot = outputOptions.dir ?? options.outDir;
        const chunkPath = path.resolve(outputRoot, chunk.fileName);
        const relativePath = normalizeRelativePath(
          path.relative(
            options.target === "preload" ? options.root : path.dirname(chunkPath),
            asset.filename,
          ),
        );
        replacePlaceholder(asset.placeholder, relativePath);
      }

      return transformed
        ? {
            code: transformed.toString(),
            map: outputOptions.sourcemap ? transformed.generateMap({ hires: "boundary" }) : null,
          }
        : null;
    },
  };
}

function createRuntimePath(options: ElectronAssetPluginOptions, placeholder: string): string {
  if (options.format === "es") {
    return `join(import.meta.dirname, ${JSON.stringify(placeholder)})`;
  }
  if (options.target === "preload") {
    return `(() => {
      const argument = process.argv.find((value) =>
        value.startsWith("--electron-vite-plus-app-path=")
      ) ?? process.argv.find((value) => value.startsWith("--app-path="));
      if (!argument) throw new Error("Unable to resolve the application path for a sandboxed preload asset.");
      return argument.slice(argument.indexOf("=") + 1) + "/" + ${JSON.stringify(placeholder)};
    })()`;
  }
  return `__dirname + "/" + ${JSON.stringify(placeholder)}`;
}

/** Supply CommonJS globals when application code is emitted as ESM. */
export function electronEsmShimPlugin(): Plugin {
  return {
    name: "electron-vite-plus:esm-shim",
    apply: "build",
    enforce: "post",
    renderChunk(code, _chunk, outputOptions) {
      if (outputOptions.format !== "es") return null;

      const needsRequire = /\brequire\s*\(/.test(code) && !hasDeclaration(code, "require");
      const needsFilename = /\b__filename\b/.test(code) && !hasDeclaration(code, "__filename");
      const needsDirname = /\b__dirname\b/.test(code) && !hasDeclaration(code, "__dirname");
      if (!needsRequire && !needsFilename && !needsDirname) return null;

      const shim = [
        needsRequire
          ? 'import { createRequire as __evpCreateRequire } from "node:module";\nconst require = __evpCreateRequire(import.meta.url);'
          : "",
        needsFilename ? "const __filename = import.meta.filename;" : "",
        needsDirname ? "const __dirname = import.meta.dirname;" : "",
      ]
        .filter(Boolean)
        .join("\n");

      const transformed = new MagicString(code);
      transformed.prepend(`${shim}\n`);
      return {
        code: transformed.toString(),
        map: outputOptions.sourcemap ? transformed.generateMap({ hires: "boundary" }) : null,
      };
    },
  };
}

function cleanUrl(id: string): string {
  const queryIndex = id.indexOf("?");
  return queryIndex === -1 ? id : id.slice(0, queryIndex);
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function toRelativePath(fromChunk: string, toAsset: string): string {
  return normalizeRelativePath(path.posix.relative(path.posix.dirname(fromChunk), toAsset));
}

function normalizeRelativePath(relativePath: string): string {
  const normalized = relativePath.split(path.sep).join("/");
  return normalized.startsWith(".") ? normalized : `./${normalized}`;
}

function hasDeclaration(code: string, identifier: string): boolean {
  const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:const|let|var|function)\\s+${escaped}\\b`).test(code);
}
