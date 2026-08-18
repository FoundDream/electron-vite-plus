import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("electronVitePlus", { framework: "vue" });
