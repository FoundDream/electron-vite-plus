import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const releaseTag = "alpha";
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
  const published = isPublished(spec);

  if (published) {
    console.log(`${spec} is already published; skipping`);
  } else {
    runNpm(["publish", ...entry.publishArgs, "--tag", releaseTag, "--provenance"]);
  }

  verifyDistTags(manifest.name, manifest.version);
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

function verifyDistTags(packageName, version) {
  const tags = readJson(["view", packageName, "dist-tags", "--json"]);
  if (tags[releaseTag] !== version) {
    throw new Error(
      `${packageName} dist-tag ${releaseTag} must point to ${version}; received ${tags[releaseTag] ?? "missing"}`,
    );
  }

  if (releaseTag !== "latest" && tags.latest === version) {
    console.warn(
      `${packageName}@${version} was implicitly tagged latest; remove it interactively with npm dist-tag rm ${packageName} latest`,
    );
  }
}

function readJson(args) {
  const result = spawnSync("npm", args, { cwd: root, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `npm ${args.join(" ")} exited with status ${result.status ?? "unknown"}:\n${result.stderr.trim()}`,
    );
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`npm ${args.join(" ")} returned invalid JSON`, { cause: error });
  }
}

function runNpm(args) {
  const result = spawnSync("npm", args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm ${args.join(" ")} exited with status ${result.status ?? "unknown"}`);
  }
}
