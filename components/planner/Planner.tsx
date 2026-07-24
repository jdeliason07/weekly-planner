"use client";

// The whole planning screen, inside the CRT. Menu bar (replaces tabs) →
// always-visible budget meter → the view. Desktop shows three windows side by
// side (Areas, Week, Ask). Mobile shows one window at a time with a day
// switcher and a horizontally scrolling row of area chips.

import { useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import { MenuBar, type MenuItem } from "@/components/chrome/MenuBar";
import { Window } from "@/components/chrome/Window";
import { MacBtn } from "@/components/chrome/MacBtn";
import { BudgetMeter } from "@/components/BudgetMeter";
import { AreasPanel } from "./AreasPanel";
import { WeekGrid } from "./WeekGrid";
import { AskPanel } from "./AskPanel";
import { SelectionBar } from "./SelectionBar";
import { dayLabel } from "@/lib/time";

const MENU: MenuItem[] = [
  { key: "plan", label: "PLAN" },
  { key: "areas", label: "AREAS" },
  { key: "sync", label: "SYNC" },
  { key: "review", label: "REVIEW" },
];

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

  return (
    <div className="flex h-full min-h-[520px] flex-col">
      <MenuBar
        items={MENU}
        active={view}
        onSelect={setView}
        right={
          <div className="flex items-center gap-1 px-1">
            <MacBtn onClick={store.loadTemplate}>LOAD TEMPLATE</MacBtn>
          </div>
        }
      />

      <BudgetMeter budget={store.budget} />

      <div className="min-h-0 flex-1 p-2">
        {view === "plan" && <PlanView />}
        {view === "areas" && <PlaceholderView title="Areas" note="Create, rank, and set targets — coming in the next phase. For now the eleven seeded areas drive planning." />}
        {view === "sync" && <PlaceholderView title="Sync" note="The dry-run diff and confirmed calendar sync land in the sync phase. The safety module (ownership rule, open-never-syncs) is already built and enforced server-side." />}
        {view === "review" && <PlaceholderView title="Weekly review" note="Planned vs. completed hours per area — coming in the check-offs phase. Mark blocks done today via a selected block's Mark Done." />}
      </div>

      <SelectionBar />
    </div>
  );
}

function PlanView() {
  const store = useStore();
  const [mobileDay, setMobileDay] = useState(1);

  return (
    <>
      {/* Desktop: three windows side by side. */}
      <div className="hidden h-full gap-2 lg:flex">
        <Window title="Areas" className="w-[208px]" bodyClassName="">
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
          Areas window with a horizontally scrolling row of chips. */}
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
      </div>
    </>
  );
}

function PlaceholderView({ title, note }: { title: string; note: string }) {
  return (
    <Window title={title} className="h-full">
      <div className="flex h-full items-center justify-center p-6">
        <p
          className="max-w-sm text-center font-prose text-black"
          style={{ fontSize: 12, lineHeight: 1.4 }}
        >
          {note}
        </p>
      </div>
    </Window>
  );
}
