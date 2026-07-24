// Parsing the model's reply into { reply, actions }. The model is told to
// return raw JSON only, but be defensive: strip markdown fences, and fall back
// to extracting from the first "{" to the last "}". Never throw.

export interface ParsedReply {
  reply: string;
  actions: unknown[];
}

export function parseModelReply(text: string): ParsedReply {
  const cleaned = stripFences(text);
  const candidates = [cleaned, extractBraces(cleaned)];
  for (const c of candidates) {
    if (!c) continue;
    try {
      const obj = JSON.parse(c);
      if (obj && typeof obj === "object") {
        const reply = typeof obj.reply === "string" ? obj.reply : "";
        const actions = Array.isArray(obj.actions) ? obj.actions : [];
        return { reply, actions };
      }
    } catch {
      // try the next candidate
    }
  }
  // Couldn't parse anything usable — return the raw text as a reply, no
  // actions. Better to show the words than to lose them.
  return { reply: text.trim(), actions: [] };
}

function stripFences(text: string): string {
  return text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function extractBraces(text: string): string | null {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return text.slice(first, last + 1);
}
