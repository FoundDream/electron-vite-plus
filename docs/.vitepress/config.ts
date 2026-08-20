import { defineConfig } from "vitepress";

const repository = "https://github.com/FoundDream/electron-vite-plus";

export default defineConfig({
  title: "electron-vite-plus",
  titleTemplate: ":title · electron-vite-plus",
  description:
    "Develop, build, and validate Electron main, preload, and renderer targets with Vite+.",
  base: "/",
  cleanUrls: true,
  lastUpdated: true,
  sitemap: {
    hostname: "https://electron-vite-plus.com/",
  },
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/mark.svg" }],
    ["meta", { name: "theme-color", content: "#6657f6" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "electron-vite-plus" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Develop, build, and prove Electron runtime readiness across main, preload, and renderer with Vite+.",
      },
    ],
  ],
  themeConfig: {
    logo: "/mark.svg",
    siteTitle: "electron-vite-plus",
    nav: [
      { text: "Docs", link: "/guide/getting-started" },
      { text: "Runtime", link: "/guide/runtime-validation" },
      { text: "Config", link: "/guide/configuration" },
      { text: "API", link: "/reference/api" },
      {
        text: "0.1.0-alpha.1",
        items: [
          { text: "Alpha scope", link: "/guide/alpha-scope" },
          { text: "Release notes", link: `${repository}/blob/main/CHANGELOG.md` },
        ],
      },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting started", link: "/guide/getting-started" },
          { text: "How the build works", link: "/guide/build-model" },
          { text: "Runtime validation", link: "/guide/runtime-validation" },
          { text: "Migrate an existing app", link: "/guide/migration" },
          { text: "Configuration", link: "/guide/configuration" },
        ],
      },
      {
        text: "Shipping",
        items: [
          { text: "Compatibility", link: "/guide/compatibility" },
          { text: "Packaging", link: "/guide/packaging" },
          { text: "Troubleshooting", link: "/guide/troubleshooting" },
          { text: "Alpha scope", link: "/guide/alpha-scope" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "CLI commands", link: "/reference/commands" },
          { text: "Programmatic API", link: "/reference/api" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: repository }],
    editLink: {
      pattern: `${repository}/edit/main/docs/:path`,
      text: "Edit this page on GitHub",
    },
    search: {
      provider: "local",
    },
    outline: {
      level: [2, 3],
      label: "On this page",
    },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Experimental software. Expect the surface to evolve during Alpha.",
    },
  },
});
