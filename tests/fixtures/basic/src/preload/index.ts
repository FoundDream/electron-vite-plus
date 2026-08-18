import { contextBridge } from "electron";
import { preloadMarker } from "./marker.js";

contextBridge.exposeInMainWorld("electronVitePlus", {
  runtime: "electron-vite-plus",
  marker: preloadMarker,
});
