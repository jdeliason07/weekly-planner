"use client";

// The planner store. In this phase it holds everything in memory, seeded with
// the eleven areas and a starter template, so the design system and the
// budget meter are fully reviewable without any accounts. The shape of the
// actions mirrors what a Supabase-backed store will expose, so wiring the
// database later is a swap of this provider, not a rewrite of the UI.
//
// It also applies validated assistant actions — the SAME validator the server
// uses (lib/ask/validate) runs again here before any mutation touches state.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  Area,
  ExternalEvent,
  PlannedBlock,
  UserSettings,
} from "./types";
import { SEED_AREAS, SEED_TEMPLATE_BLOCKS, SEED_USER } from "./seed";
import { computeBudget, type Budget } from "./budget";
import { validateAction, type AssistantAction } from "./ask/validate";
import { toHHMM, GRID_START_MIN } from "./time";

let idCounter = 1000;
function uid(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

// The Monday (or week-start) date for the current demo week.
function currentWeekStart(weekStartsOn: number): string {
  const now = new Date();
  const day = now.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  const d = new Date(now);
  d.setDate(now.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function dateForColumn(weekStart: string, column: number): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + column);
  return d.toISOString().slice(0, 10);
}

interface State {
  areas: Area[];
  blocks: PlannedBlock[];
  external: ExternalEvent[];
  settings: UserSettings;
  weekStart: string;
  armedAreaId: string | null;
  selectedBlockId: string | null;
}

type Action =
  | { t: "arm"; areaId: string | null }
  | { t: "select"; blockId: string | null }
  | { t: "place"; column: number; start: string; end: string }
  | { t: "toggleDone"; blockId: string }
  | { t: "remove"; blockId: string }
  | { t: "move"; blockId: string; column: number; start: string; end: string }
  | { t: "assistant"; actions: AssistantAction[] }
  | { t: "loadTemplate" };

function makeInitial(): State {
  const settings: UserSettings = {
    user_id: SEED_USER,
    sleep_hours_per_night: 8,
    week_starts_on: 0,
    timezone: "America/Denver",
  };
  const weekStart = currentWeekStart(settings.week_starts_on);

  const blocks: PlannedBlock[] = SEED_TEMPLATE_BLOCKS.map((tb) => {
    const area = SEED_AREAS.find((a) => a.id === tb.area_id)!;
    return {
      id: uid("b"),
      week_plan_id: "demo-week",
      area_id: tb.area_id,
      date: dateForColumn(weekStart, tb.day_of_week),
      start_time: tb.start_time,
      end_time: tb.end_time,
      label: tb.label,
      type: tb.type ?? area.default_type,
      gcal_event_id: null,
      sync_state: "unsynced",
      completed_at: null,
    };
  });

  // A couple of read-only external events, to show locked commitments on the
  // grid and in the LOCKED figure. Not owned by the app.
  const external: ExternalEvent[] = [
    {
      gcal_event_id: "ext-dentist",
      date: dateForColumn(weekStart, 2),
      start_time: "11:00",
      end_time: "12:00",
      title: "Dentist",
      ownedByApp: false,
    },
    {
      gcal_event_id: "ext-standup",
      date: dateForColumn(weekStart, 4),
      start_time: "13:00",
      end_time: "13:30",
      title: "Team standup",
      ownedByApp: false,
    },
  ];

  return {
    areas: SEED_AREAS,
    blocks,
    external,
    settings,
    weekStart,
    armedAreaId: null,
    selectedBlockId: null,
  };
}

function columnFromDate(weekStart: string, date: string): number {
  const a = new Date(weekStart + "T00:00:00").getTime();
  const b = new Date(date + "T00:00:00").getTime();
  return Math.round((b - a) / 86_400_000);
}

function reducer(state: State, action: Action): State {
  switch (action.t) {
    case "arm":
      return { ...state, armedAreaId: action.areaId, selectedBlockId: null };
    case "select":
      return { ...state, selectedBlockId: action.blockId, armedAreaId: null };
    case "place": {
      if (!state.armedAreaId) return state;
      const area = state.areas.find((a) => a.id === state.armedAreaId);
      if (!area) return state;
      const block: PlannedBlock = {
        id: uid("b"),
        week_plan_id: "demo-week",
        area_id: area.id,
        date: dateForColumn(state.weekStart, action.column),
        start_time: action.start,
        end_time: action.end,
        label: null,
        type: area.default_type,
        gcal_event_id: null,
        sync_state: "unsynced",
        completed_at: null,
      };
      return { ...state, blocks: [...state.blocks, block] };
    }
    case "toggleDone":
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.blockId
            ? {
                ...b,
                completed_at: b.completed_at ? null : new Date().toISOString(),
              }
            : b
        ),
      };
    case "remove":
      return {
        ...state,
        selectedBlockId: null,
        blocks: state.blocks.filter((b) => b.id !== action.blockId),
      };
    case "move":
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.blockId
            ? {
                ...b,
                date: dateForColumn(state.weekStart, action.column),
                start_time: action.start,
                end_time: action.end,
                sync_state: "unsynced",
              }
            : b
        ),
      };
    case "assistant": {
      // Re-validate every action against current state before applying.
      let blocks = state.blocks;
      for (const raw of action.actions) {
        const v = validateAction(raw, {
          areas: state.areas,
          weekStartsOn: state.settings.week_starts_on,
          blockIds: new Set(blocks.map((b) => b.id)),
        });
        if (!v.ok) continue; // silently drop malformed/hostile actions
        const a = v.value;
        if (a.action === "add") {
          const area = state.areas.find((x) => x.id === a.area)!;
          // The assistant may never create Open blocks that would later reach
          // the calendar issue aside — it can add to any area, but Open stays
          // the area default. It never syncs regardless (enforced in sync).
          blocks = [
            ...blocks,
            {
              id: uid("b"),
              week_plan_id: "demo-week",
              area_id: area.id,
              date: dateForColumn(state.weekStart, a.column),
              start_time: a.start,
              end_time: a.end,
              label: a.label ?? null,
              type: area.default_type,
              gcal_event_id: null,
              sync_state: "unsynced",
              completed_at: null,
            },
          ];
        } else if (a.action === "move") {
          blocks = blocks.map((b) =>
            b.id === a.id
              ? {
                  ...b,
                  date: dateForColumn(state.weekStart, a.column),
                  start_time: a.start,
                  end_time: a.end,
                  sync_state: "unsynced",
                }
              : b
          );
        } else if (a.action === "remove") {
          blocks = blocks.filter((b) => b.id !== a.id);
        }
      }
      return { ...state, blocks };
    }
    case "loadTemplate": {
      const fresh = makeInitial();
      return { ...state, blocks: fresh.blocks };
    }
    default:
      return state;
  }
}

interface StoreValue extends State {
  budget: Budget;
  columnFromDate: (date: string) => number;
  arm: (areaId: string | null) => void;
  select: (blockId: string | null) => void;
  place: (column: number, start: string, end: string) => void;
  toggleDone: (blockId: string) => void;
  remove: (blockId: string) => void;
  move: (blockId: string, column: number, start: string, end: string) => void;
  applyAssistant: (actions: AssistantAction[]) => void;
  loadTemplate: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitial);

  const budget = useMemo(
    () =>
      computeBudget(
        state.areas,
        state.blocks,
        state.external,
        state.settings.sleep_hours_per_night
      ),
    [state.areas, state.blocks, state.external, state.settings]
  );

  const value: StoreValue = {
    ...state,
    budget,
    columnFromDate: useCallback(
      (date: string) => columnFromDate(state.weekStart, date),
      [state.weekStart]
    ),
    arm: useCallback((areaId) => dispatch({ t: "arm", areaId }), []),
    select: useCallback((blockId) => dispatch({ t: "select", blockId }), []),
    place: useCallback(
      (column, start, end) => dispatch({ t: "place", column, start, end }),
      []
    ),
    toggleDone: useCallback(
      (blockId) => dispatch({ t: "toggleDone", blockId }),
      []
    ),
    remove: useCallback((blockId) => dispatch({ t: "remove", blockId }), []),
    move: useCallback(
      (blockId, column, start, end) =>
        dispatch({ t: "move", blockId, column, start, end }),
      []
    ),
    applyAssistant: useCallback(
      (actions) => dispatch({ t: "assistant", actions }),
      []
    ),
    loadTemplate: useCallback(() => dispatch({ t: "loadTemplate" }), []),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error("useStore must be used within StoreProvider");
  return v;
}

// Default placement duration when tapping an empty slot: one hour, snapped.
export function defaultPlacement(slotMinutes: number): {
  start: string;
  end: string;
} {
  const start = Math.max(slotMinutes, GRID_START_MIN);
  return { start: toHHMM(start), end: toHHMM(start + 60) };
}
