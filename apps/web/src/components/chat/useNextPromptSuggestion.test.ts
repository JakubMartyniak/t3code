import { ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { observeTurn } from "./useNextPromptSuggestion";

const threadA = ThreadId.make("thread-a");
const threadB = ThreadId.make("thread-b");

describe("observeTurn", () => {
  it("qualifies a thread once a turn runs while it is open", () => {
    const opened = observeTurn(null, threadA, true);
    expect(opened.sawTurn).toBe(false);
    const running = observeTurn(opened, threadA, false);
    expect(running.sawTurn).toBe(true);
    expect(observeTurn(running, threadA, true)).toBe(running);
  });

  it("forgets the turn on any thread switch, so a background finish never qualifies", () => {
    const watchedA = observeTurn(observeTurn(null, threadA, true), threadA, false);
    const idleB = observeTurn(watchedA, threadB, true);
    expect(idleB.sawTurn).toBe(false);
    expect(observeTurn(idleB, threadA, true).sawTurn).toBe(false);
  });

  it("qualifies a thread opened mid-turn", () => {
    expect(observeTurn(null, threadA, false).sawTurn).toBe(true);
  });
});
