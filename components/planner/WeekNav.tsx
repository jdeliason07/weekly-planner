"use client";

// Week navigation. A weekly planner you can only point at this week is half
// a tool — the Sunday ritual is mostly about the week ahead. Each week keeps
// its own blocks; moving between them never disturbs the others.

import { useStore } from "@/lib/store";
import { MacBtn } from "@/components/chrome/MacBtn";

export function WeekNav() {
  const store = useStore();

  const start = new Date(store.weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const sameMonth = start.getMonth() === end.getMonth();
  const range = sameMonth
    ? `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${end.getDate()}`
    : `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-black bg-white px-1.5 py-1">
      <MacBtn onClick={() => store.shiftWeek(-1)} aria-label="Previous week">
        ◀
      </MacBtn>
      <div className="flex min-w-0 flex-1 flex-col items-center leading-none">
        <span className="font-chrome text-black" style={{ fontSize: 10 }}>
          {range.toUpperCase()}
        </span>
        <span
          className="mt-[2px] font-chrome text-black"
          style={{ fontSize: 7, opacity: 0.75 }}
        >
          {store.isCurrentWeek ? "THIS WEEK" : "PLANNING AHEAD"}
        </span>
      </div>
      <MacBtn onClick={() => store.shiftWeek(1)} aria-label="Next week">
        ▶
      </MacBtn>
      {!store.isCurrentWeek && (
        <MacBtn onClick={store.goToCurrentWeek}>TODAY</MacBtn>
      )}
    </div>
  );
}
