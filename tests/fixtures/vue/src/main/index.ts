import { app, BrowserWindow } from "electron";
import path from "node:path";

void app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(import.meta.dirname, "../preload/index.cjs"),
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await window.loadFile(path.join(import.meta.dirname, "../renderer/index.html"));
  }
});
