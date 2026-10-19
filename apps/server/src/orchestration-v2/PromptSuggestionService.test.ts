import { describe, expect, it } from "vite-plus/test";
import { MessageId, RunId } from "@t3tools/contracts";

import { selectPromptSuggestionContext } from "./PromptSuggestionService.ts";

const message = (
  id: string,
  role: "user" | "assistant" | "system",
  text: string,
  options: { readonly streaming?: boolean; readonly runId?: string } = {},
) => ({
  id: MessageId.make(id),
  role,
  text,
  streaming: options.streaming ?? false,
  runId: options.runId === undefined ? null : RunId.make(options.runId),
});

describe("selectPromptSuggestionContext", () => {
  it("suggests after a settled agent reply, with the user's latest messages oldest first", () => {
    const context = selectPromptSuggestionContext(
      [
        message("u1", "user", "first"),
        message("a1", "assistant", "one"),
        message("u2", "user", "second"),
        message("u3", "user", "   "),
        message("u4", "user", "third"),
        message("u5", "user", "fourth"),
        message("u6", "user", "fifth"),
        message("a2", "assistant", "  Want me to open a PR?  "),
      ],
      [],
    );
    expect(context).toEqual({
      messageId: MessageId.make("a2"),
      lastAssistantMessage: "Want me to open a PR?",
      recentUserMessages: ["second", "third", "fourth", "fifth"],
    });
  });

  it("ignores turns the user rolled back", () => {
    const context = selectPromptSuggestionContext(
      [
        message("u1", "user", "add dark mode", { runId: "run-1" }),
        message("a1", "assistant", "Added dark mode.", { runId: "run-1" }),
        message("u2", "user", "delete the tests", { runId: "run-2" }),
        message("a2", "assistant", "Deleted them.", { runId: "run-2" }),
      ],
      [
        { id: RunId.make("run-1"), status: "completed" },
        { id: RunId.make("run-2"), status: "rolled_back" },
      ],
    );
    expect(context).toEqual({
      messageId: MessageId.make("a1"),
      lastAssistantMessage: "Added dark mode.",
      recentUserMessages: ["add dark mode"],
    });
  });

  it("does not suggest while the agent is still replying", () => {
    expect(
      selectPromptSuggestionContext(
        [
          message("u1", "user", "go"),
          message("a1", "assistant", "Working on", { streaming: true }),
        ],
        [],
      ),
    ).toBeNull();
  });

  it("does not suggest when the user already spoke last", () => {
    expect(
      selectPromptSuggestionContext(
        [message("a1", "assistant", "Done."), message("u1", "user", "now commit it")],
        [],
      ),
    ).toBeNull();
  });

  it("does not suggest from an empty agent reply", () => {
    expect(selectPromptSuggestionContext([message("a1", "assistant", "  ")], [])).toBeNull();
    expect(selectPromptSuggestionContext([], [])).toBeNull();
  });
});
