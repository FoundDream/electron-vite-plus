import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const templates = ["vanilla", "react", "vue"] as const;
export type Template = (typeof templates)[number];

export interface CreateProjectOptions {
  directory: string;
  template?: Template;
}

export function createProject(options: CreateProjectOptions): string {
  const target = path.resolve(options.directory);
  const template = options.template ?? "vanilla";
  if (!templates.includes(template)) {
    throw new Error(`Unknown template: ${template}. Choose one of: ${templates.join(", ")}.`);
  }
  if (existsSync(target) && readdirSync(target).length > 0) {
    throw new Error(`Target directory is not empty: ${target}`);
  }

  const templateRoot = fileURLToPath(new URL(`../templates/${template}/`, import.meta.url));
  mkdirSync(target, { recursive: true });
  cpSync(templateRoot, target, { recursive: true });

  renameSync(path.join(target, "_package.json.template"), path.join(target, "package.json"));
  renameSync(path.join(target, "_vite.config.ts.template"), path.join(target, "vite.config.ts"));
  renameSync(path.join(target, "_gitignore"), path.join(target, ".gitignore"));
  const packagePath = path.join(target, "package.json");
  const packageSource = readFileSync(packagePath, "utf8");
  const packageName = normalizePackageName(path.basename(target));
  const nameMarker = '"name": "electron-vite-plus-app"';
  if (!packageSource.includes(nameMarker)) {
    throw new Error(`Template package is missing its name marker: ${template}`);
  }
  writeFileSync(
    packagePath,
    packageSource.replace(nameMarker, `"name": ${JSON.stringify(packageName)}`),
  );
  return target;
}

function normalizePackageName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-._~]/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "electron-vite-plus-app";
}
