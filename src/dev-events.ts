export type DevelopmentTarget = "renderer" | "main" | "preload" | "lifecycle";

export type DevelopmentPhase =
  | "file-change"
  | "build-start"
  | "build-success"
  | "build-error"
  | "hmr-send"
  | "hmr-before-update"
  | "hmr-after-update"
  | "hmr-before-full-reload"
  | "hmr-client-ready"
  | "hmr-ws-connect"
  | "hmr-ws-disconnect"
  | "restart"
  | "reload"
  | "ready";

export interface DevelopmentEvent {
  target: DevelopmentTarget;
  phase: DevelopmentPhase;
  timestamp: number;
  file?: string;
  kind?: string;
  durationMs?: number;
  message?: string;
}

export type DevelopmentEventInput = Omit<DevelopmentEvent, "timestamp"> & {
  timestamp?: number;
};

export type DevelopmentEventListener = (event: DevelopmentEvent) => void;

export function createDevelopmentReporter(
  debug: boolean,
  listener?: DevelopmentEventListener,
): DevelopmentEventListener {
  return (event) => {
    listener?.(event);
    if (!debug) return;

    const details = [
      event.kind,
      event.file,
      event.durationMs === undefined ? undefined : `${event.durationMs.toFixed(1)}ms`,
      event.message,
    ].filter(Boolean);
    console.log(
      `[electron-vite-plus] ${event.target}:${event.phase}${
        details.length > 0 ? ` ${details.join(" ")}` : ""
      }`,
    );
  };
}

export function emitDevelopmentEvent(
  listener: DevelopmentEventListener,
  event: DevelopmentEventInput,
): void {
  listener({
    ...event,
    timestamp: event.timestamp ?? Date.now(),
  });
}
