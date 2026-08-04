"use client";

// The whole planning screen, inside the CRT. Menu bar (replaces tabs) →
// always-visible budget meter → the active view, which fills the remaining
// height and scrolls internally.
//
// Desktop: three windows side by side (Areas, Week, Ask).
// Mobile: one view at a time. Week fills the screen with a day switcher and
// a collapsible area tray; Ask gets its own menu item.

import { useCallback, useEffect, useRef, useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import { MenuBar, type MenuItem } from "@/components/chrome/MenuBar";
import { Window } from "@/components/chrome/Window";
import { BudgetMeter } from "@/components/BudgetMeter";
import { AreasPanel } from "./AreasPanel";
import { AreasEditor } from "./AreasEditor";
import { WeekGrid } from "./WeekGrid";
import { AskPanel } from "./AskPanel";
import { SelectionBar } from "./SelectionBar";
import { SyncView } from "./SyncView";
import { ReviewView } from "./ReviewView";
import { dayLabel } from "@/lib/time";
import { WeekNav } from "./WeekNav";

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
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // On desktop Ask lives in its own window, so it isn't a menu item.
  useEffect(() => {
    if (isDesktop && view === "ask") setView("plan");
  }, [isDesktop, view]);

  const pendingSync =
    store.syncDiff.created.length +
    store.syncDiff.moved.length +
    store.syncDiff.expired.length +
    store.syncDiff.cancelled.length;

  const menu: MenuItem[] = [
    { key: "plan", label: "PLAN" },
    ...(isDesktop ? [] : [{ key: "ask", label: "ASK" }]),
    { key: "areas", label: "AREAS" },
    { key: "sync", label: pendingSync > 0 ? `SYNC ${pendingSync}` : "SYNC" },
    { key: "review", label: "REVIEW" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MenuBar
        items={menu}
        active={view}
        onSelect={setView}
        right={<TemplateMenu />}
      />

      <WeekNav />

      <BudgetMeter budget={store.budget} />

      <div className="flex min-h-0 flex-1 flex-col p-1.5 sm:p-2">
        {view === "plan" && <PlanView isDesktop={isDesktop} />}
        {view === "ask" && (
          <Window title="Ask" className="min-h-0 flex-1" scroll={false}>
            <AskPanel />
          </Window>
        )}
        {view === "areas" && <AreasEditor />}
        {view === "sync" && <SyncView />}
        {view === "review" && <ReviewView />}
      </div>

      <SelectionBar />
    </div>
  );
}

// Template actions, tucked into a small menu so the bar doesn't crowd.
function TemplateMenu() {
  const store = useStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-stretch">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`px-2 font-chrome ${
          open ? "bg-black text-white" : "bg-white text-black"
        }`}
        style={{ fontSize: 9 }}
      >
        WEEK ▾
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 w-[188px] border border-black bg-white"
          style={{ boxShadow: "2px 2px 0 #000" }}
        >
          <MenuAction
            label="LOAD TEMPLATE"
            hint="Replace this week with your template"
            onClick={() => {
              store.loadTemplate();
              setOpen(false);
            }}
          />
          <MenuAction
            label="SAVE AS TEMPLATE"
            hint="Promote this week to your template"
            onClick={() => {
              store.saveToTemplate();
              setOpen(false);
            }}
          />
          <MenuAction
            label="CLEAR WEEK"
            hint="Remove every block from this week"
            onClick={() => {
              store.clearWeek();
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function MenuAction({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full border-b border-black px-2 py-1.5 text-left last:border-b-0 hover:bg-black hover:text-white"
    >
      <span className="block font-chrome" style={{ fontSize: 9 }}>
        {label}
      </span>
      <span className="block font-prose" style={{ fontSize: 9, opacity: 0.8 }}>
        {hint}
      </span>
    </button>
  );
}

function PlanView({ isDesktop }: { isDesktop: boolean }) {
  const store = useStore();
  const [mobileDay, setMobileDay] = useState(0);
  const [trayOpen, setTrayOpen] = useState(true);

  // The current day is mirrored in a ref so stepDay can read it synchronously
  // and report back whether it actually moved — the drag-to-edge gesture needs
  // that answer immediately, and a state updater can't give it.
  const dayRef = useRef(mobileDay);
  dayRef.current = mobileDay;

  // Step the visible day, rolling into the neighbouring week at the edges so
  // swiping never dead-ends on Sunday or Saturday.
  const stepDay = useCallback(
    (dir: 1 | -1) => {
      const next = dayRef.current + dir;
      if (next < 0) {
        store.shiftWeek(-1);
        dayRef.current = 6;
        setMobileDay(6);
      } else if (next > 6) {
        store.shiftWeek(1);
        dayRef.current = 0;
        setMobileDay(0);
      } else {
        dayRef.current = next;
        setMobileDay(next);
      }
      return true;
    },
    [store]
  );

  // Jump to today's column on first paint only. Re-running this whenever the
  // week changes would yank the view back to today mid-swipe.
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current) return;
    jumped.current = true;
    const now = new Date();
    const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const col = store.columnFromDate(local);
    if (col >= 0 && col <= 6) {
      dayRef.current = col;
      setMobileDay(col);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isDesktop) {
    return (
      <div className="flex min-h-0 flex-1 gap-2">
        <Window title="Areas" className="w-[204px] shrink-0">
          <AreasPanel />
        </Window>
        <Window title="Week" className="min-w-0 flex-1" scroll={false}>
          <WeekGrid />
        </Window>
        <Window title="Ask" className="w-[252px] shrink-0" scroll={false}>
          <AskPanel />
        </Window>
      </div>
    );
  }

  const dayCount = store.weekBlocks.filter(
    (b) => store.columnFromDate(b.date) === mobileDay
  ).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <Window title="Week" className="min-h-0 flex-1" scroll={false}>
        <div className="flex h-full min-h-0 flex-col">
          {/* Day switcher — a real tap target per day, with the date. */}
          <div className="flex shrink-0 gap-[2px] border-b border-black p-1">
            {[0, 1, 2, 3, 4, 5, 6].map((c) => {
              const d = new Date(store.weekStart + "T00:00:00");
              d.setDate(d.getDate() + c);
              const active = mobileDay === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setMobileDay(c)}
                  aria-pressed={active}
                  className={`flex flex-1 flex-col items-center rounded-btn border border-black py-1 ${
                    active ? "bg-black text-white" : "bg-white text-black"
                  }`}
                >
                  <span className="font-chrome" style={{ fontSize: 8 }}>
                    {dayLabel(c, store.settings.week_starts_on)
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                  <span className="font-chrome" style={{ fontSize: 9 }}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
          <WeekGrid singleColumn={mobileDay} onDayStep={stepDay} />
        </div>
      </Window>

      {/* Area tray — collapsible so the grid can own the screen. */}
      <div
        className="shrink-0 border border-black bg-white"
        style={{ boxShadow: "2px 2px 0 #000" }}
      >
        <button
          type="button"
          onClick={() => setTrayOpen(!trayOpen)}
          aria-expanded={trayOpen}
          className="flex w-full items-center justify-between border-b border-black px-2 py-1"
        >
          <span className="font-chrome text-black" style={{ fontSize: 9 }}>
            AREAS {store.armedAreaId ? "· ARMED" : ""}
          </span>
          <span className="font-chrome text-black" style={{ fontSize: 9 }}>
            {trayOpen ? "▾" : "▴"}
          </span>
        </button>
        {trayOpen && <AreasPanel horizontal />}
        {!trayOpen && dayCount === 0 && (
          <p className="px-2 py-1 font-prose text-black" style={{ fontSize: 10 }}>
            Nothing planned this day. Open Areas and tap one to place time.
          </p>
        )}
      </div>
    </div>
  );
}
