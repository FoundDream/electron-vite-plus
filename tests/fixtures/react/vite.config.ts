import react from "@vitejs/plugin-react";

export default {
  plugins: [react()],
  electron: {
    main: {
      entry: "src/main/index.ts",
    },
    preload: {
      entry: "src/preload/index.ts",
    },
    renderer: {
      root: "src/renderer",
    },
  },
};
