import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronVitePlus", { framework: "vue" });

if (process.env.ELECTRON_VITE_PLUS_SMOKE === "1") {
  window.addEventListener(
    "electron-vite-plus:renderer-ready",
    () => ipcRenderer.send("electron-vite-plus:smoke-ready"),
    { once: true },
  );
}
