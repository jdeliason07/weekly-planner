"use client";

// When a block is selected, a bar pins to the bottom of the screen. Beyond
// Mark Done and Delete it now edits the block in place: label, type, day,
// start (shift ±30m) and length (resize ±30m). Every edit marks the block
// unsynced — the calendar never silently drifts from the plan.

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { MacBtn } from "@/components/chrome/MacBtn";
import type { BlockType } from "@/lib/types";

const TYPE_ORDER: BlockType[] = ["anchor", "sprint", "open"];
const TYPE_LABEL: Record<BlockType, string> = {
  anchor: "ANCHOR",
  sprint: "SPRINT",
  open: "OPEN",
};

export function SelectionBar() {
  const store = useStore();
  const block = store.blocks.find((b) => b.id === store.selectedBlockId);
  const area = store.areas.find((a) => a.id === block?.area_id);
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel(block?.label ?? "");
  }, [block?.id, block?.label]);

  if (!block || !area) return null;
  const done = !!block.completed_at;

  function commitLabel() {
    if (!block) return;
    const trimmed = label.trim();
    if ((block.label ?? "") !== trimmed) {
      store.updateBlock(block.id, { label: trimmed || null });
    }
  }

  function cycleType() {
    if (!block) return;
    const next =
      TYPE_ORDER[(TYPE_ORDER.indexOf(block.type) + 1) % TYPE_ORDER.length];
    store.updateBlock(block.id, { type: next });
  }

  return (
    <div className="shrink-0 border-t border-black bg-black px-2 py-1">
      <div className="flex flex-wrap items-center gap-1">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitLabel();
          }}
          placeholder={area.name}
          aria-label="Block label"
          className="min-w-[100px] flex-1 border border-white bg-black px-1 py-[2px] font-prose text-white placeholder:text-white/60"
          style={{ fontSize: 11 }}
        />
        <span
          className="shrink-0 font-chrome text-white"
          style={{ fontSize: 8 }}
        >
          {block.start_time}–{block.end_time}
        </span>
        <MacBtn onClick={cycleType} title="Change block type">
          {TYPE_LABEL[block.type]}
        </MacBtn>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1">
        <MacBtn onClick={() => store.nudgeBlock(block.id, "day", -1)} aria-label="Move a day earlier">
          ◀ DAY
        </MacBtn>
        <MacBtn onClick={() => store.nudgeBlock(block.id, "day", 1)} aria-label="Move a day later">
          DAY ▶
        </MacBtn>
        <MacBtn onClick={() => store.nudgeBlock(block.id, "shift", -30)} aria-label="Start 30 minutes earlier">
          −30M
        </MacBtn>
        <MacBtn onClick={() => store.nudgeBlock(block.id, "shift", 30)} aria-label="Start 30 minutes later">
          +30M
        </MacBtn>
        <MacBtn onClick={() => store.nudgeBlock(block.id, "resize", -30)} aria-label="Shorten by 30 minutes">
          SHORTER
        </MacBtn>
        <MacBtn onClick={() => store.nudgeBlock(block.id, "resize", 30)} aria-label="Lengthen by 30 minutes">
          LONGER
        </MacBtn>
        <span className="mx-1 hidden h-4 w-px bg-white sm:block" aria-hidden />
        <MacBtn onClick={() => store.toggleDone(block.id)}>
          {done ? "UNDO DONE" : "MARK DONE"}
        </MacBtn>
        <MacBtn onClick={() => store.remove(block.id)}>DELETE</MacBtn>
        <MacBtn primary onClick={() => store.select(null)} className="ml-auto">
          CLOSE
        </MacBtn>
      </div>
    </div>
  );
}
