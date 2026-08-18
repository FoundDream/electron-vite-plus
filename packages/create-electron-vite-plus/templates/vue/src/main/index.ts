import { app, BrowserWindow } from "electron";
import path from "node:path";

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 900,
    height: 640,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      preload: path.join(import.meta.dirname, "../preload/index.cjs"),
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
