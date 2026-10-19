import type { EnvironmentId, MessageId, ThreadId } from "@t3tools/contracts";
import { useAtomValue } from "@effect/atom-react";
import { useEffect, useEffectEvent, useState } from "react";

import { orchestrationEnvironment } from "../../state/orchestration";
import { useAtomCommand } from "../../state/use-atom-command";
import type { ChatMessage } from "../../types";

/**
 * The prompt the user is most likely to send next, once the agent has settled on a reply.
 * Requested once per agent reply; anything after it (a new message, streaming) hides it.
 * Only replies that finish while the thread is open qualify, so browsing old threads never
 * runs a model.
 */
export function useNextPromptSuggestion(input: {
  readonly environmentId: EnvironmentId;
  readonly threadId: ThreadId | null;
  readonly enabled: boolean;
  readonly idle: boolean;
  readonly messages: ReadonlyArray<Pick<ChatMessage, "id" | "role" | "streaming">>;
}): string | null {
  const suggest = useAtomCommand(orchestrationEnvironment.suggestNextPrompt, {
    reportFailure: false,
  });
  const canSuggest = useAtomValue(
    orchestrationEnvironment.suggestNextPrompt.permissionAtom(input.environmentId),
  );
  const [result, setResult] = useState<{
    readonly messageId: MessageId;
    readonly suggestion: string | null;
  } | null>(null);

  const [watchedThreadId, setWatchedThreadId] = useState<ThreadId | null>(null);
  if (!input.idle && input.threadId !== null && watchedThreadId !== input.threadId) {
    setWatchedThreadId(input.threadId);
  }

  const lastMessage = input.messages.at(-1);
  const afterMessageId =
    input.enabled &&
    watchedThreadId === input.threadId &&
    canSuggest &&
    input.idle &&
    input.threadId !== null &&
    lastMessage?.role === "assistant" &&
    !lastMessage.streaming
      ? lastMessage.id
      : null;

  const request = useEffectEvent(
    (target: { readonly threadId: ThreadId; readonly afterMessageId: MessageId }) =>
      suggest({ environmentId: input.environmentId, input: target }),
  );

  useEffect(() => {
    const threadId = input.threadId;
    if (afterMessageId === null || threadId === null) return;
    let cancelled = false;
    void request({ threadId, afterMessageId }).then((response) => {
      if (cancelled) return;
      setResult({
        messageId: afterMessageId,
        suggestion: response._tag === "Success" ? response.value.suggestion : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [afterMessageId, input.threadId]);

  return afterMessageId !== null && result?.messageId === afterMessageId ? result.suggestion : null;
}
