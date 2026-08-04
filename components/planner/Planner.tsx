"use client";

// The whole planning screen, inside the CRT. Menu bar (replaces tabs) →
// always-visible budget meter → the view. Desktop shows three windows side by
// side (Areas, Week, Ask). Mobile shows one window at a time with a day
// switcher and a horizontally scrolling row of area chips.

import { useEffect, useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import { MenuBar, type MenuItem } from "@/components/chrome/MenuBar";
import { Window } from "@/components/chrome/Window";
import { MacBtn } from "@/components/chrome/MacBtn";
import { BudgetMeter } from "@/components/BudgetMeter";
import { AreasPanel } from "./AreasPanel";
import { AreasEditor } from "./AreasEditor";
import { WeekGrid } from "./WeekGrid";
import { AskPanel } from "./AskPanel";
import { SelectionBar } from "./SelectionBar";
import { SyncView } from "./SyncView";
import { ReviewView } from "./ReviewView";
import { dayLabel } from "@/lib/time";

export function Planner() {
  return (
    <StoreProvider>
      <PlannerInner />
    </StoreProvider>
  );
}

function PlannerInner() {
  const store = useStore();
  const [view, setView] = useState("plan");

  const pendingSync =
    store.syncDiff.created.length +
    store.syncDiff.moved.length +
    store.syncDiff.expired.length;

  const menu: MenuItem[] = [
    { key: "plan", label: "PLAN" },
    { key: "areas", label: "AREAS" },
    { key: "sync", label: pendingSync > 0 ? `SYNC:${pendingSync}` : "SYNC" },
    { key: "review", label: "REVIEW" },
  ];

  return (
    <div className="flex h-full min-h-[520px] flex-col">
      <MenuBar
        items={menu}
        active={view}
        onSelect={setView}
        right={
          <div className="flex items-center gap-1 px-1">
            <MacBtn
              onClick={store.loadTemplate}
              title="Load the template into this week. Replaces the current draft."
            >
              LOAD TMPL
            </MacBtn>
            <MacBtn
              onClick={store.saveToTemplate}
              title="Promote this week's blocks to the template."
              className="hidden sm:block"
            >
              SAVE TMPL
            </MacBtn>
          </div>
        }
      />

      <BudgetMeter budget={store.budget} />

      <div className="min-h-0 flex-1 p-2">
        {view === "plan" && <PlanView />}
        {view === "areas" && <AreasEditor />}
        {view === "sync" && <SyncView />}
        {view === "review" && <ReviewView />}
      </div>

      <SelectionBar />
    </div>
  );
}

function PlanView() {
  const store = useStore();
  const [mobileDay, setMobileDay] = useState(0);

  // Jump to today's column once mounted (local time, so no UTC drift).
  useEffect(() => {
    const now = new Date();
    const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const col = store.columnFromDate(local);
    if (col >= 0 && col <= 6) setMobileDay(col);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.weekStart]);

  return (
    <>
      {/* Desktop: three windows side by side. */}
      <div className="hidden h-full gap-2 lg:flex">
        <Window title="Areas" className="w-[208px]">
          <AreasPanel />
        </Window>
        <Window title="Week" className="min-w-0 flex-1">
          <div className="h-full">
            <WeekGrid />
          </div>
        </Window>
        <Window title="Ask" className="w-[256px]">
          <AskPanel />
        </Window>
      </div>

      {/* Mobile: one window at a time. Day view + a day switcher, plus an
          Areas window with a horizontally scrolling row of chips, and Ask
          below. */}
      <div className="flex h-full flex-col gap-2 lg:hidden">
        <Window title="Week" className="min-h-[360px] flex-1">
          <div className="flex flex-col">
            <div className="flex gap-[2px] border-b border-black p-1">
              {[0, 1, 2, 3, 4, 5, 6].map((c) => (
                <MacBtn
                  key={c}
                  active={mobileDay === c}
                  onClick={() => setMobileDay(c)}
                  className="flex-1"
                >
                  {dayLabel(c, store.settings.week_starts_on).slice(0, 1)}
                </MacBtn>
              ))}
            </div>
            <WeekGrid singleColumn={mobileDay} />
          </div>
        </Window>
        <Window title="Areas" className="shrink-0">
          <AreasPanel horizontal />
        </Window>
        <Window title="Ask" className="min-h-[220px] shrink-0">
          <AskPanel />
        </Window>
      </div>
    </>
  );
}
