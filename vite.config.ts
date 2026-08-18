import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/cli.ts"],
    dts: true,
    format: ["esm"],
    sourcemap: true,
    clean: true,
  },
  lint: {
    ignorePatterns: ["dist/**", "packages/**/dist/**", "tests/fixtures/**/out/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
