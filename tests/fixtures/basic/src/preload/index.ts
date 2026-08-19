import { contextBridge } from "electron";
import appIcon from "../main/app-icon.txt?asset";
import { preloadMarker } from "./marker.js";

contextBridge.exposeInMainWorld("electronVitePlus", {
  runtime: "electron-vite-plus",
  marker: preloadMarker,
  appIcon,
});
