import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const core = readJson("package.json");
const creator = readJson("packages/create-electron-vite-plus/package.json");
const templatePaths = [
  "packages/create-electron-vite-plus/templates/vanilla/_package.json.template",
  "packages/create-electron-vite-plus/templates/react/_package.json.template",
  "packages/create-electron-vite-plus/templates/vue/_package.json.template",
];
const expectedRepository = "git+https://github.com/FoundDream/electron-vite-plus.git";

assert(core.name === "electron-vite-plus", "unexpected core package name");
assert(creator.name === "create-electron-vite-plus", "unexpected creator package name");
assert(core.version === creator.version, "core and creator versions must match");
assert(core.files?.includes("client.d.ts"), "core package files must include client.d.ts");
assert(core.exports?.["./client"]?.types === "./client.d.ts", "core must export ./client types");
assert(
  core.repository?.url === expectedRepository,
  `core repository.url must be ${expectedRepository}`,
);
assert(
  creator.repository?.url === expectedRepository,
  `creator repository.url must be ${expectedRepository}`,
);

for (const templatePath of templatePaths) {
  const template = readJson(templatePath);
  assert(
    template.devDependencies?.[core.name] === core.version,
    `${templatePath} must pin ${core.name} to ${core.version}`,
  );
  assert(
    template.scripts?.doctor === "electron-vite-plus doctor",
    `${templatePath} must expose the doctor script`,
  );
}

const changelog = readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
assert(changelog.includes(`## ${core.version}`), `CHANGELOG.md must include ${core.version}`);

const tag = process.env.GITHUB_REF_TYPE === "tag" ? process.env.GITHUB_REF_NAME : undefined;
if (tag) {
  assert(tag === `v${core.version}`, `tag ${tag} must match package version v${core.version}`);
}

console.log(`release metadata verified for ${core.name}@${core.version}`);
console.log(`release metadata verified for ${creator.name}@${creator.version}`);

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
