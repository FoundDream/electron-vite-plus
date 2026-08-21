import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import appIcon from "./app-icon.txt?asset";
import publicIcon from "../../resources/public-icon.txt?asset";
import { smokeMarker } from "./marker.js";

void smokeMarker;
void appIcon;
void publicIcon;

if (process.env.ELECTRON_VITE_PLUS_SMOKE === "1") {
  ipcMain.once("electron-vite-plus:smoke-ready", () => {
    console.log("EVP_SMOKE_READY");
  });
}
if (process.env.ELECTRON_VITE_PLUS_HMR_TEST === "1") {
  ipcMain.on("electron-vite-plus:hmr-marker", (_event, marker: unknown) => {
    console.log(`EVP_HMR_MARKER ${String(marker)}`);
  });
}

async function createWindow(): Promise<void> {
  const hideWindow = process.env.ELECTRON_VITE_PLUS_HMR_TEST === "1";
  const window = new BrowserWindow({
    width: 900,
    height: 640,
    show: !hideWindow,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      preload: path.join(import.meta.dirname, "../preload/index.cjs"),
      additionalArguments: [`--electron-vite-plus-app-path=${app.getAppPath()}`],
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await window.loadFile(path.join(import.meta.dirname, "../renderer/index.html"));
  }
  if (!hideWindow) window.show();
}

void app.whenReady().then(async () => {
  if (process.env.EVP_DEV_SMOKE_TEST === "1") {
    console.log(`EVP_DEV_SMOKE_READY ${process.pid}`);
    setTimeout(() => app.quit(), 15_000);
    return;
  }
  await createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
