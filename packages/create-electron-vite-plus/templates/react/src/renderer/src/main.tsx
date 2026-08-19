import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function App() {
  return <h1>Electron + React + Vite+</h1>;
}

createRoot(document.querySelector("#root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

window.dispatchEvent(new Event("electron-vite-plus:renderer-ready"));
