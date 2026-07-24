// The Ask route handler. The Anthropic API call runs HERE, never in the
// browser. The API key and system prompt are server-side only.
//
// Hard boundary: this route can return actions that mutate the DRAFT week and
// nothing else. There is no code path from here to Google Calendar. Do not add
// one.

import { NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/ask/prompt";
import { parseModelReply } from "@/lib/ask/parse";
import { validateAll } from "@/lib/ask/validate";
import type { Area } from "@/lib/types";

export const runtime = "nodejs";

interface AskRequestBody {
  message: string;
  // The client sends a serialized week (built by lib/ask/prompt.serializeWeek)
  // plus the minimal context the validator needs: areas and week-start.
  weekJson: string;
  areas: Area[];
  weekStartsOn: number;
  blockIds: string[];
}

const MODEL = "claude-sonnet-5";

export async function POST(req: Request) {
  let body: AskRequestBody;
  try {
    body = (await req.json()) as AskRequestBody;
  } catch {
    return NextResponse.json(
      { reply: "That message didn't come through. Try again.", actions: [] },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply:
        "The Ask panel isn't connected yet — set ANTHROPIC_API_KEY on the server to turn it on.",
      actions: [],
    });
  }

  const userContent = `Here is the current week state:\n${body.weekJson}\n\nJack says: ${body.message}`;

  let text: string;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Anthropic error", res.status, detail);
      return NextResponse.json({
        reply:
          "Couldn't reach the assistant just now. Your week is untouched — try again in a moment.",
        actions: [],
      });
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    text =
      data.content?.map((c) => (c.type === "text" ? c.text ?? "" : "")).join("") ??
      "";
  } catch (err) {
    console.error("Ask route fetch failed", err);
    return NextResponse.json({
      reply:
        "Couldn't reach the assistant just now. Your week is untouched — try again in a moment.",
      actions: [],
    });
  }

  const parsed = parseModelReply(text);

  // Validate on the server. The client will validate again before applying.
  const actions = validateAll(parsed.actions, {
    areas: body.areas,
    weekStartsOn: body.weekStartsOn,
    blockIds: new Set(body.blockIds),
  });

  return NextResponse.json({ reply: parsed.reply, actions });
}
