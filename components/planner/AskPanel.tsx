"use client";

// The Ask panel. An embedded chat that can read the week and modify the
// DRAFT. It posts to /api/ask (server-side Anthropic call). Returned actions
// are re-validated in the store before applying. After actions apply, a small
// "N changes applied" marker shows under the reply.

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { serializeWeek } from "@/lib/ask/prompt";
import { MacBtn } from "@/components/chrome/MacBtn";
import type { AssistantAction } from "@/lib/ask/validate";

interface Turn {
  role: "user" | "assistant";
  content: string;
  applied?: number;
}

const STARTERS = [
  "Am I overcommitted this week?",
  "Move my Korvo time to Thursday",
  "I have a test Friday — find me 3 more study hours",
];

export function AskPanel() {
  const store = useStore();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns, busy]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", content: message }]);
    setBusy(true);

    try {
      const weekJson = serializeWeek(
        store.areas,
        store.weekBlocks,
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
          blockIds: store.weekBlocks.map((b) => b.id),
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {turns.length === 0 && (
          <div>
            <p
              className="font-prose text-black"
              style={{ fontSize: 11, lineHeight: 1.45 }}
            >
              I can read your week and change it — add, move, or cut blocks. I
              never touch your calendar, and I&apos;ll tell you when
              you&apos;re taking on too much.
            </p>
            <div className="mt-2 space-y-1">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="block w-full border border-black bg-white px-2 py-1 text-left font-prose text-black hover:bg-black hover:text-white"
                  style={{ fontSize: 10, lineHeight: 1.3 }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div
            key={i}
            className={t.role === "user" ? "text-right" : "text-left"}
          >
            <div
              className={`inline-block max-w-[92%] border border-black px-2 py-1 text-left ${
                t.role === "user" ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              <p
                className="font-prose"
                style={{ fontSize: 11, lineHeight: 1.4 }}
              >
                {t.content}
              </p>
            </div>
            {t.role === "assistant" && t.applied ? (
              <div
                className="mt-[3px] font-chrome text-black"
                style={{ fontSize: 8 }}
              >
                ✓ {t.applied} CHANGE{t.applied === 1 ? "" : "S"} APPLIED
              </div>
            ) : null}
          </div>
        ))}

        {busy && (
          <div className="font-chrome text-black" style={{ fontSize: 8 }}>
            THINKING…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-black p-1.5">
        <div className="flex gap-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Ask to move something…"
            aria-label="Ask the assistant"
            className="min-w-0 flex-1 border border-black bg-white px-1.5 py-1 font-prose text-black"
            style={{ fontSize: 12 }}
          />
          <MacBtn primary onClick={() => send()} disabled={busy || !input.trim()}>
            SEND
          </MacBtn>
        </div>
      </div>
    </div>
  );
}
