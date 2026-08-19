declare module "*?asset" {
  const path: string;
  export default path;
}

declare module "*?asset&asarUnpack" {
  const path: string;
  export default path;
}

declare module "*.node" {
  const nativeModule: unknown;
  export default nativeModule;
}

declare module "*.wasm?loader" {
  const load: (
    imports?: Record<string, Record<string, unknown>>,
  ) => Promise<{ readonly exports: Record<string, unknown> }>;
  export default load;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly ELECTRON_RENDERER_URL?: string;
    readonly ELECTRON_VITE_PLUS_SMOKE?: "1";
  }
}
