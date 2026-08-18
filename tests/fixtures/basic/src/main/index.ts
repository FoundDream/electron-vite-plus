import { app, BrowserWindow } from "electron";
import path from "node:path";
import { smokeMarker } from "./marker.js";

void smokeMarker;

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 900,
    height: 640,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      preload: path.join(import.meta.dirname, "../preload/index.cjs"),
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await window.loadFile(path.join(import.meta.dirname, "../renderer/index.html"));
  }
  window.show();
}

void app.whenReady().then(async () => {
  if (process.env.EVP_SMOKE_TEST === "1") {
    console.log("EVP_SMOKE_READY");
    app.quit();
    return;
  }
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
