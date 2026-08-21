/// <reference types="vite/client" />

document.documentElement.dataset.runtime = "electron-vite-plus";
document.documentElement.dataset.hmrMarker = "initial";
window.dispatchEvent(
  new CustomEvent("electron-vite-plus:hmr-marker", {
    detail: document.documentElement.dataset.hmrMarker,
  }),
);
window.dispatchEvent(new Event("electron-vite-plus:renderer-ready"));

if (import.meta.hot) import.meta.hot.accept();
