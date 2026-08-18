import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("electronVitePlus", {
  runtime: "electron-vite-plus",
});
