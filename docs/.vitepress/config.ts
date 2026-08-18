import { defineConfig } from "vitepress";

const repository = "https://github.com/FoundDream/electron-vite-plus";

export default defineConfig({
  title: "electron-vite-plus",
  titleTemplate: ":title · electron-vite-plus",
  description: "Electron build tooling powered by Vite+.",
  base: "/electron-vite-plus/",
  cleanUrls: true,
  lastUpdated: true,
  sitemap: {
    hostname: "https://founddream.github.io/electron-vite-plus/",
  },
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/electron-vite-plus/mark.svg" }],
    ["meta", { name: "theme-color", content: "#ff6b35" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "electron-vite-plus" }],
    [
      "meta",
      {
        property: "og:description",
        content: "One Vite+ workflow for Electron main, preload, and renderer targets.",
      },
    ],
  ],
  themeConfig: {
    logo: "/mark.svg",
    siteTitle: "electron-vite-plus",
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Configuration", link: "/guide/configuration" },
      { text: "Commands", link: "/reference/commands" },
      {
        text: "0.1.0-alpha",
        items: [
          { text: "Alpha scope", link: "/guide/alpha-scope" },
          { text: "Changelog", link: `${repository}/blob/main/CHANGELOG.md` },
        ],
      },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting started", link: "/guide/getting-started" },
          { text: "How the build works", link: "/guide/build-model" },
          { text: "Configuration", link: "/guide/configuration" },
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
      copyright: "Experimental software — expect the surface to evolve during Alpha.",
    },
  },
});
