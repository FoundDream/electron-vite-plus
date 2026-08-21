document.documentElement.dataset.runtime = "electron-vite-plus";
window.dispatchEvent(new Event("electron-vite-plus:renderer-ready"));

if (import.meta.hot) import.meta.hot.accept();
