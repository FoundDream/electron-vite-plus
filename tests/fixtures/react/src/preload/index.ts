import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("electronVitePlus", { framework: "react" });
