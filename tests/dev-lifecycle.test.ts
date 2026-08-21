import { describe, expect, test } from "vite-plus/test";
import type { DevelopmentEvent } from "../src/dev-events.js";
import { DevelopmentLifecycleCoordinator } from "../src/dev-lifecycle.js";

describe("development lifecycle coordinator", () => {
  test("coalesces concurrent main and preload builds into one restart", async () => {
    const actions: string[] = [];
    const events: DevelopmentEvent[] = [];
    const coordinator = new DevelopmentLifecycleCoordinator({
      restartElectron: async () => {
        actions.push("restart");
      },
      reloadRenderer: () => {
        actions.push("reload");
      },
      onEvent: (event) => events.push(event),
      settleDelay: 5,
    });
    coordinator.activate();

    coordinator.buildStarted("main");
    coordinator.buildStarted("preload");
    coordinator.buildSucceeded("preload", 8);
    coordinator.buildSucceeded("main", 12);

    await waitFor(() => actions.length === 1);
    expect(actions).toEqual(["restart"]);
    expect(events.filter((event) => event.phase === "restart")).toHaveLength(1);
    expect(events.filter((event) => event.phase === "reload")).toHaveLength(0);
    await coordinator.close();
  });

  test("reloads the renderer for an isolated preload build", async () => {
    const actions: string[] = [];
    const coordinator = new DevelopmentLifecycleCoordinator({
      restartElectron: async () => {
        actions.push("restart");
      },
      reloadRenderer: () => {
        actions.push("reload");
      },
      onEvent: () => {},
      settleDelay: 5,
    });
    coordinator.activate();

    coordinator.buildStarted("preload");
    coordinator.buildSucceeded("preload");

    await waitFor(() => actions.length === 1);
    expect(actions).toEqual(["reload"]);
    await coordinator.close();
  });

  test("waits for a failed target to recover before applying lifecycle changes", async () => {
    const actions: string[] = [];
    const coordinator = new DevelopmentLifecycleCoordinator({
      restartElectron: async () => {
        actions.push("restart");
      },
      reloadRenderer: () => {
        actions.push("reload");
      },
      onEvent: () => {},
      settleDelay: 5,
    });
    coordinator.activate();

    coordinator.buildStarted("main");
    coordinator.buildStarted("preload");
    coordinator.buildFailed("main", new Error("broken import"));
    coordinator.buildSucceeded("preload");
    await delay(20);
    expect(actions).toEqual([]);

    coordinator.buildStarted("main");
    coordinator.buildSucceeded("main");
    await waitFor(() => actions.length === 1);
    expect(actions).toEqual(["restart"]);
    await coordinator.close();
  });

  test("serializes lifecycle work while preserving later changes", async () => {
    const actions: string[] = [];
    let finishRestart: (() => void) | undefined;
    const coordinator = new DevelopmentLifecycleCoordinator({
      restartElectron: () =>
        new Promise<void>((resolve) => {
          actions.push("restart:start");
          finishRestart = () => {
            actions.push("restart:end");
            resolve();
          };
        }),
      reloadRenderer: () => {
        actions.push("reload");
      },
      onEvent: () => {},
      settleDelay: 5,
    });
    coordinator.activate();

    coordinator.buildStarted("main");
    coordinator.buildSucceeded("main");
    await waitFor(() => actions.length === 1);

    coordinator.buildStarted("preload");
    coordinator.buildSucceeded("preload");
    await delay(20);
    expect(actions).toEqual(["restart:start"]);

    finishRestart?.();
    await waitFor(() => actions.length === 3);
    expect(actions).toEqual(["restart:start", "restart:end", "reload"]);
    await coordinator.close();
  });
});

async function waitFor(predicate: () => boolean, timeout = 1_000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for lifecycle action");
    await delay(5);
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
