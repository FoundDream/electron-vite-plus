export default {
  define: {
    __EVP_TOP_LEVEL_CONFIG__: JSON.stringify("inherited"),
  },
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
