import type { HotPayload, Plugin } from "vite-plus";
import type { DevelopmentEventListener } from "../dev-events.js";
import { emitDevelopmentEvent } from "../dev-events.js";

const clientEvent = "electron-vite-plus:hmr-client";
const clientModuleId = "/@electron-vite-plus/hmr-trace";
const resolvedClientModuleId = `\0${clientModuleId}`;

interface HmrClientEvent {
  phase?: string;
  timestamp?: number;
  updateTimestamp?: number;
  kind?: string;
}

export function electronHmrTracePlugin(onEvent: DevelopmentEventListener): Plugin {
  return {
    name: "electron-vite-plus:hmr-trace",
    apply: "serve",
    resolveId(id) {
      if (id === clientModuleId) return resolvedClientModuleId;
    },
    load(id) {
      if (id === resolvedClientModuleId) return createClientSource();
    },
    configureServer(server) {
      const receiveClientEvent = (raw: unknown): void => {
        const event = (raw ?? {}) as HmrClientEvent;
        const phase = resolveClientPhase(event.phase);
        if (!phase) return;
        const timestamp = Number.isFinite(event.timestamp) ? event.timestamp! : Date.now();
        const updateTimestamp = Number.isFinite(event.updateTimestamp)
          ? event.updateTimestamp
          : undefined;
        emitDevelopmentEvent(onEvent, {
          target: "renderer",
          phase,
          timestamp,
          ...(typeof event.kind === "string" ? { kind: event.kind } : {}),
          ...(updateTimestamp === undefined
            ? {}
            : { durationMs: Math.max(0, timestamp - updateTimestamp) }),
        });
      };
      server.hot.on(clientEvent, receiveClientEvent);
      const hot = server.hot;
      const originalSend = hot.send.bind(hot);
      hot.send = (payload: HotPayload) => {
        if (payload.type === "update" || payload.type === "full-reload") {
          const updateTimestamp =
            payload.type === "update" && payload.updates.length > 0
              ? Math.min(...payload.updates.map((update) => update.timestamp))
              : undefined;
          const timestamp = Date.now();
          emitDevelopmentEvent(onEvent, {
            target: "renderer",
            phase: "hmr-send",
            timestamp,
            kind: payload.type,
            ...(updateTimestamp !== undefined && Number.isFinite(updateTimestamp)
              ? { durationMs: Math.max(0, timestamp - updateTimestamp) }
              : {}),
          });
        }
        originalSend(payload);
      };
      server.httpServer?.once("close", () => {
        hot.off(clientEvent, receiveClientEvent);
        hot.send = originalSend;
      });
    },
    handleHotUpdate(context) {
      emitDevelopmentEvent(onEvent, {
        target: "renderer",
        phase: "file-change",
        timestamp: context.timestamp,
        file: context.file,
      });
    },
    transformIndexHtml() {
      return [
        {
          tag: "script",
          attrs: { type: "module", src: clientModuleId },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

function resolveClientPhase(
  phase: string | undefined,
):
  | "hmr-before-update"
  | "hmr-after-update"
  | "hmr-before-full-reload"
  | "hmr-client-ready"
  | "hmr-ws-connect"
  | "hmr-ws-disconnect"
  | undefined {
  switch (phase) {
    case "before-update":
      return "hmr-before-update";
    case "after-update":
      return "hmr-after-update";
    case "before-full-reload":
      return "hmr-before-full-reload";
    case "client-ready":
      return "hmr-client-ready";
    case "ws-connect":
      return "hmr-ws-connect";
    case "ws-disconnect":
      return "hmr-ws-disconnect";
    default:
      return undefined;
  }
}

function createClientSource(): string {
  return `
const hot = import.meta.hot;
if (hot) {
  const report = (phase, payload, kind) => {
    const timestamps = [
      ...(payload?.updates?.map((update) => update.timestamp) ?? []),
      payload?.timestamp,
    ].filter(Number.isFinite);
    hot.send(${JSON.stringify(clientEvent)}, {
      phase,
      kind,
      timestamp: Date.now(),
      updateTimestamp: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
    });
  };
  hot.on("vite:beforeUpdate", (payload) => report("before-update", payload, "update"));
  hot.on("vite:afterUpdate", (payload) => report("after-update", payload, "update"));
  hot.on("vite:beforeFullReload", (payload) => report("before-full-reload", payload, "full-reload"));
  hot.on("vite:ws:connect", () => report("ws-connect", undefined, "connect"));
  hot.on("vite:ws:disconnect", () => report("ws-disconnect", undefined, "disconnect"));
  report("client-ready", undefined, "ready");
}
`;
}
