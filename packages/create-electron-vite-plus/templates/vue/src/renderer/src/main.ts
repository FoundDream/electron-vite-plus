import { createApp } from "vue";
import App from "./App.vue";

createApp(App).mount("#app");
window.dispatchEvent(new Event("electron-vite-plus:renderer-ready"));
