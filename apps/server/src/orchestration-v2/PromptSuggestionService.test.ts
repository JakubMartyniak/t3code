import { describe, expect, it } from "vite-plus/test";
import { MessageId } from "@t3tools/contracts";

import { selectPromptSuggestionContext } from "./PromptSuggestionService.ts";

const message = (
  id: string,
  role: "user" | "assistant" | "system",
  text: string,
  streaming = false,
) => ({ id: MessageId.make(id), role, text, streaming });

describe("selectPromptSuggestionContext", () => {
  it("suggests after a settled agent reply, with the user's latest messages oldest first", () => {
    const context = selectPromptSuggestionContext([
      message("u1", "user", "first"),
      message("a1", "assistant", "one"),
      message("u2", "user", "second"),
      message("u3", "user", "   "),
      message("u4", "user", "third"),
      message("u5", "user", "fourth"),
      message("u6", "user", "fifth"),
      message("a2", "assistant", "  Want me to open a PR?  "),
    ]);
    expect(context).toEqual({
      messageId: MessageId.make("a2"),
      lastAssistantMessage: "Want me to open a PR?",
      recentUserMessages: ["second", "third", "fourth", "fifth"],
    });
  });

  it("does not suggest while the agent is still replying", () => {
    expect(
      selectPromptSuggestionContext([
        message("u1", "user", "go"),
        message("a1", "assistant", "Working on", true),
      ]),
    ).toBeNull();
  });

  it("does not suggest when the user already spoke last", () => {
    expect(
      selectPromptSuggestionContext([
        message("a1", "assistant", "Done."),
        message("u1", "user", "now commit it"),
      ]),
    ).toBeNull();
  });

  it("does not suggest from an empty agent reply", () => {
    expect(selectPromptSuggestionContext([message("a1", "assistant", "  ")])).toBeNull();
    expect(selectPromptSuggestionContext([])).toBeNull();
  });
});
