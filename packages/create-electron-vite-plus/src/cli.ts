#!/usr/bin/env node

import path from "node:path";
import { parseArgs } from "node:util";
import { createProject, templates, type Template } from "./index.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    template: { type: "string", short: "t" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  printHelp();
} else {
  const directory = positionals[0] ?? "electron-vite-plus-app";
  const template = values.template ?? "vanilla";
  if (!templates.includes(template as Template)) {
    throw new Error(`Unknown template: ${template}. Choose one of: ${templates.join(", ")}.`);
  }

  const target = createProject({ directory, template: template as Template });
  const relativeTarget = path.relative(process.cwd(), target) || ".";
  const displayedTarget = relativeTarget.startsWith("..") ? target : relativeTarget;
  console.log(`\nCreated ${template} Electron app in ${target}\n`);
  if (displayedTarget !== ".") console.log(`  cd ${displayedTarget}`);
  console.log("  vp install");
  console.log("  vp run dev\n");
}

function printHelp(): void {
  console.log(`create-electron-vite-plus

Usage:
  create-electron-vite-plus [directory] [options]

Options:
  -t, --template <name>  vanilla | react | vue
  -h, --help             Show help`);
}
