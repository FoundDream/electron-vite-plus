import { contextBridge, ipcRenderer } from "electron";
import appIcon from "../main/app-icon.txt?asset";
import { preloadMarker } from "./marker.js";

contextBridge.exposeInMainWorld("electronVitePlus", {
  runtime: "electron-vite-plus",
  marker: preloadMarker,
  appIcon,
});

if (process.env.ELECTRON_VITE_PLUS_SMOKE === "1") {
  window.addEventListener(
    "electron-vite-plus:renderer-ready",
    () => ipcRenderer.send("electron-vite-plus:smoke-ready"),
    { once: true },
  );
}
