import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";

if (process.env.ELECTRON_VITE_PLUS_SMOKE === "1") {
  ipcMain.once("electron-vite-plus:smoke-ready", () => {
    console.log("EVP_SMOKE_READY");
  });
}

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 900,
    height: 640,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      preload: path.join(import.meta.dirname, "../preload/index.cjs"),
      additionalArguments: [`--electron-vite-plus-app-path=${app.getAppPath()}`],
    },
  });

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    await window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await window.loadFile(path.join(import.meta.dirname, "../renderer/index.html"));
  }
}

void app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
