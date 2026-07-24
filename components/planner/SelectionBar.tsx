"use client";

// When a block is selected, a bar pins to the bottom of the screen with Mark
// Done and Delete. In-bit: black bar area with white chrome.

import { useStore } from "@/lib/store";
import { MacBtn } from "@/components/chrome/MacBtn";

export function SelectionBar() {
  const store = useStore();
  const block = store.blocks.find((b) => b.id === store.selectedBlockId);
  if (!block) return null;
  const area = store.areas.find((a) => a.id === block.area_id);
  const done = !!block.completed_at;

  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-black bg-black px-2 py-1">
      <span
        className="min-w-0 flex-1 truncate font-prose text-white"
        style={{ fontSize: 11 }}
      >
        {block.label ?? area?.name} · {block.start_time}–{block.end_time}
      </span>
      <MacBtn onClick={() => store.toggleDone(block.id)}>
        {done ? "UNDO DONE" : "MARK DONE"}
      </MacBtn>
      <MacBtn onClick={() => store.remove(block.id)}>DELETE</MacBtn>
      <MacBtn onClick={() => store.select(null)}>CLOSE</MacBtn>
    </div>
  );
}
