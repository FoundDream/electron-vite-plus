import vue from "@vitejs/plugin-vue";

export default {
  plugins: [vue()],
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
