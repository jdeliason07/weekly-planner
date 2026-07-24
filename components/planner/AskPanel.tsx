"use client";

// The Ask panel. An embedded chat that can read the week and modify the DRAFT.
// It posts to /api/ask (server-side Anthropic call). Returned actions are
// re-validated in the store before applying. After actions apply, a small
// "N changes applied" marker shows under the reply.

import { useState } from "react";
import { useStore } from "@/lib/store";
import { serializeWeek } from "@/lib/ask/prompt";
import { MacBtn } from "@/components/chrome/MacBtn";
import type { AssistantAction } from "@/lib/ask/validate";

interface Turn {
  role: "user" | "assistant";
  content: string;
  applied?: number;
}

export function AskPanel() {
  const store = useStore();
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "assistant",
      content:
        "I can move things around your draft week — add, move, or cut blocks. I never touch your calendar. What's on your mind?",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", content: message }]);
    setBusy(true);

    try {
      const weekJson = serializeWeek(
        store.areas,
        store.blocks,
        store.budget,
        store.settings.week_starts_on
      );
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          weekJson,
          areas: store.areas,
          weekStartsOn: store.settings.week_starts_on,
          blockIds: store.blocks.map((b) => b.id),
        }),
      });
      const data = (await res.json()) as {
        reply: string;
        actions: AssistantAction[];
      };
      const actions = Array.isArray(data.actions) ? data.actions : [];
      if (actions.length) store.applyAssistant(actions);
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content: data.reply || "Done.",
          applied: actions.length,
        },
      ]);
    } catch {
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content:
            "Couldn't reach the assistant. Your week is untouched — try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-[300px] flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-2">
        {turns.map((t, i) => (
          <div key={i} className={t.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block max-w-[90%] border border-black px-2 py-1 text-left ${
                t.role === "user" ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              <p className="font-prose" style={{ fontSize: 11, lineHeight: 1.3 }}>
                {t.content}
              </p>
            </div>
            {t.role === "assistant" && t.applied ? (
              <div
                className="mt-[2px] font-chrome text-black"
                style={{ fontSize: 8 }}
              >
                {t.applied} CHANGE{t.applied === 1 ? "" : "S"} APPLIED
              </div>
            ) : null}
          </div>
        ))}
        {busy && (
          <div className="font-chrome text-black" style={{ fontSize: 8 }}>
            THINKING…
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-black p-1">
        <div className="flex gap-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Ask to move something…"
            className="min-w-0 flex-1 border border-black bg-white px-1 py-1 font-prose text-black"
            style={{ fontSize: 11 }}
          />
          <MacBtn primary onClick={send} disabled={busy || !input.trim()}>
            SEND
          </MacBtn>
        </div>
      </div>
    </div>
  );
}
