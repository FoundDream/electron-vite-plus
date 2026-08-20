import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const releaseTag = "alpha";
const distTagVerificationAttempts = 8;
const distTagVerificationDelay = 2_000;
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

  await verifyDistTags(manifest.name, manifest.version);
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

async function verifyDistTags(packageName, version) {
  let observedTag;

  for (let attempt = 1; attempt <= distTagVerificationAttempts; attempt += 1) {
    const tags = readJson(["view", packageName, "dist-tags", "--json"]);
    observedTag = tags[releaseTag];
    if (observedTag === version) {
      if (releaseTag !== "latest" && tags.latest === version) {
        console.warn(
          `${packageName}@${version} was implicitly tagged latest; remove it interactively with npm dist-tag rm ${packageName} latest`,
        );
      }
      return;
    }

    if (attempt < distTagVerificationAttempts) {
      console.log(
        `${packageName} dist-tag ${releaseTag} still points to ${observedTag ?? "missing"}; retrying after registry propagation`,
      );
      await delay(distTagVerificationDelay);
    }
  }

  throw new Error(
    `${packageName} dist-tag ${releaseTag} must point to ${version}; received ${observedTag ?? "missing"}`,
  );
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
