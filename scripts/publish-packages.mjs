import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const packages = [
  { manifest: "package.json", publishArgs: [] },
  {
    manifest: "packages/create-electron-vite-plus/package.json",
    publishArgs: ["--workspace=create-electron-vite-plus"],
  },
];

for (const entry of packages) {
  const manifest = JSON.parse(readFileSync(path.join(root, entry.manifest), "utf8"));
  const spec = `${manifest.name}@${manifest.version}`;
  if (isPublished(spec)) {
    console.log(`${spec} is already published; skipping`);
    continue;
  }

  runNpm(["publish", ...entry.publishArgs, "--tag", "alpha", "--provenance"]);
}

function isPublished(spec) {
  const result = spawnSync("npm", ["view", spec, "version", "--json"], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status === 0) return true;

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (/E404|404 Not Found/.test(output)) return false;
  throw new Error(`Unable to determine whether ${spec} is published:\n${output.trim()}`);
}

function runNpm(args) {
  const result = spawnSync("npm", args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm ${args.join(" ")} exited with status ${result.status ?? "unknown"}`);
  }
}
