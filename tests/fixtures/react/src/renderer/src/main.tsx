import { StrictMode } from "react";
import type { JSX } from "react";
import { createRoot } from "react-dom/client";

function App(): JSX.Element {
  return <h1>electron-vite-plus-react-ready</h1>;
}

createRoot(document.querySelector("#root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
