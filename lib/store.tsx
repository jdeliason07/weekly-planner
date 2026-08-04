"use client";

// The planner store. Holds the working state client-side, persisted to
// localStorage so the week survives reloads, and shaped so a Supabase-backed
// store can replace this provider without rewriting the UI.
//
// It also applies validated assistant actions — the SAME validator the server
// uses (lib/ask/validate) runs again here before any mutation touches state.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  Area,
  BlockType,
  ExternalEvent,
  PlannedBlock,
  TemplateBlock,
  UserSettings,
} from "./types";
import { SEED_AREAS, SEED_TEMPLATE_BLOCKS, SEED_USER } from "./seed";
import { computeBudget, type Budget } from "./budget";
import { validateAction, type AssistantAction } from "./ask/validate";
import { toHHMM, toMinutes, GRID_START_MIN, GRID_END_MIN } from "./time";
import { computeDiff, type SyncDiff } from "./calendar/sync";
import type { GCalEvent } from "./calendar/ownership";
import { PATTERN_KEYS } from "./patterns";

const STORAGE_KEY = "weekmachine-state-v1";

function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Local (not UTC) YYYY-MM-DD — toISOString would shift evening hours across
// the date line and corrupt week boundaries.
function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function currentWeekStart(weekStartsOn: number): string {
  const now = new Date();
  const diff = (now.getDay() - weekStartsOn + 7) % 7;
  const d = new Date(now);
  d.setDate(now.getDate() - diff);
  return localISODate(d);
}

function dateForColumn(weekStart: string, column: number): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + column);
  return localISODate(d);
}

function columnFromDateStr(weekStart: string, date: string): number {
  const a = new Date(weekStart + "T00:00:00").getTime();
  const b = new Date(date + "T00:00:00").getTime();
  return Math.round((b - a) / 86_400_000);
}

function addDays(dateISO: string, days: number): string {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + days);
  return localISODate(d);
}

// Blocks live across many weeks (each carries its own date). These select the
// week currently in view, so navigating weeks never disturbs the others.
function inWeek(blocks: PlannedBlock[], weekStart: string): PlannedBlock[] {
  const end = addDays(weekStart, 7);
  return blocks.filter((b) => b.date >= weekStart && b.date < end);
}

function outsideWeek(blocks: PlannedBlock[], weekStart: string): PlannedBlock[] {
  const end = addDays(weekStart, 7);
  return blocks.filter((b) => b.date < weekStart || b.date >= end);
}

/** An event this app has written to the calendar. Tracked separately from
 *  blocks so that deleting a block still leaves a record to clean up — that
 *  is what makes "cancel my X" actually remove it from the calendar. */
interface SyncedEvent {
  gcalEventId: string;
  blockId: string;
  summary: string;
}

interface State {
  areas: Area[];
  blocks: PlannedBlock[];
  template: TemplateBlock[];
  external: ExternalEvent[];
  settings: UserSettings;
  weekStart: string;
  armedAreaId: string | null;
  selectedBlockId: string | null;
  lastSyncedAt: string | null;
  syncedEvents: SyncedEvent[];
}

type Action =
  | { t: "hydrate"; data: Partial<State> }
  | { t: "arm"; areaId: string | null }
  | { t: "select"; blockId: string | null }
  | { t: "place"; column: number; start: string; end: string }
  | { t: "toggleDone"; blockId: string }
  | { t: "remove"; blockId: string }
  | { t: "updateBlock"; blockId: string; patch: { label?: string | null; type?: BlockType } }
  | { t: "nudgeBlock"; blockId: string; kind: "shift" | "resize" | "day"; delta: number }
  | { t: "assistant"; actions: AssistantAction[] }
  | { t: "loadTemplate" }
  | { t: "saveToTemplate" }
  | { t: "clearWeek" }
  | { t: "setWeekStart"; weekStart: string }
  | { t: "updateArea"; areaId: string; patch: Partial<Area> }
  | { t: "addArea"; name: string }
  | { t: "archiveArea"; areaId: string }
  | { t: "moveAreaRank"; areaId: string; dir: -1 | 1 }
  | { t: "updateSettings"; patch: Partial<UserSettings> }
  | { t: "syncCommit" };

function instantiateTemplate(
  template: TemplateBlock[],
  areas: Area[],
  weekStart: string
): PlannedBlock[] {
  return template.flatMap((tb) => {
    const area = areas.find((a) => a.id === tb.area_id);
    if (!area || area.archived_at) return [];
    const date = dateForColumn(weekStart, tb.day_of_week);
    // Sprint blocks past their season end auto-retire: they stop appearing
    // in future weeks the moment the season is over.
    const type = tb.type ?? area.default_type;
    if (type === "sprint" && area.season_end_date && date > area.season_end_date) {
      return [];
    }
    return [
      {
        id: uid("b"),
        week_plan_id: "week-" + weekStart,
        area_id: tb.area_id,
        date,
        start_time: tb.start_time,
        end_time: tb.end_time,
        label: tb.label,
        type,
        gcal_event_id: null,
        sync_state: "unsynced" as const,
        completed_at: null,
      },
    ];
  });
}

function makeInitial(): State {
  const settings: UserSettings = {
    user_id: SEED_USER,
    sleep_hours_per_night: 8,
    week_starts_on: 0,
    timezone: "America/Denver",
  };
  const weekStart = currentWeekStart(settings.week_starts_on);
  const blocks = instantiateTemplate(SEED_TEMPLATE_BLOCKS, SEED_AREAS, weekStart);

  // Read-only external events, to show locked commitments. Not owned by the
  // app. (Replaced by real Calendar reads once Google is connected.)
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
    template: SEED_TEMPLATE_BLOCKS,
    external,
    settings,
    weekStart,
    armedAreaId: null,
    selectedBlockId: null,
    lastSyncedAt: null,
    syncedEvents: [],
  };
}

function reducer(state: State, action: Action): State {
  switch (action.t) {
    case "hydrate":
      return {
        ...state,
        ...action.data,
        armedAreaId: null,
        selectedBlockId: null,
      };
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
        week_plan_id: "week-" + state.weekStart,
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
      // Stay armed — placing several blocks in a row is the common flow.
      return { ...state, blocks: [...state.blocks, block] };
    }
    case "toggleDone":
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.blockId
            ? { ...b, completed_at: b.completed_at ? null : new Date().toISOString() }
            : b
        ),
      };
    case "remove":
      return {
        ...state,
        selectedBlockId: null,
        blocks: state.blocks.filter((b) => b.id !== action.blockId),
      };
    case "updateBlock":
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.blockId
            ? {
                ...b,
                ...("label" in action.patch ? { label: action.patch.label ?? null } : {}),
                ...(action.patch.type ? { type: action.patch.type } : {}),
                sync_state: "unsynced",
              }
            : b
        ),
      };
    case "nudgeBlock": {
      return {
        ...state,
        blocks: state.blocks.map((b) => {
          if (b.id !== action.blockId) return b;
          if (action.kind === "day") {
            const col = columnFromDateStr(state.weekStart, b.date);
            const next = Math.min(6, Math.max(0, col + action.delta));
            if (next === col) return b;
            return { ...b, date: dateForColumn(state.weekStart, next), sync_state: "unsynced" };
          }
          const s = toMinutes(b.start_time);
          const e = toMinutes(b.end_time);
          if (action.kind === "shift") {
            const dur = e - s;
            let ns = s + action.delta;
            ns = Math.max(GRID_START_MIN, Math.min(ns, GRID_END_MIN - dur));
            if (ns === s) return b;
            return {
              ...b,
              start_time: toHHMM(ns),
              end_time: toHHMM(ns + dur),
              sync_state: "unsynced",
            };
          }
          // resize: adjust the end, keep at least 30 minutes.
          let ne = e + action.delta;
          ne = Math.max(s + 30, Math.min(ne, GRID_END_MIN));
          if (ne === e) return b;
          return { ...b, end_time: toHHMM(ne), sync_state: "unsynced" };
        }),
      };
    }
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
          blocks = [
            ...blocks,
            {
              id: uid("b"),
              week_plan_id: "week-" + state.weekStart,
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
      // Load the template into the week currently in view — the Sunday
      // ritual. Never modifies the template, and never touches other weeks.
      const fresh = instantiateTemplate(
        state.template,
        state.areas,
        state.weekStart
      );
      return {
        ...state,
        blocks: [...outsideWeek(state.blocks, state.weekStart), ...fresh],
        selectedBlockId: null,
        armedAreaId: null,
      };
    }
    case "setWeekStart":
      return {
        ...state,
        weekStart: action.weekStart,
        selectedBlockId: null,
        armedAreaId: null,
      };
    case "saveToTemplate": {
      // Explicit promotion: the current week's blocks become the template.
      const template: TemplateBlock[] = inWeek(state.blocks, state.weekStart).map((b) => ({
        id: uid("t"),
        user_id: SEED_USER,
        area_id: b.area_id,
        day_of_week: Math.min(6, Math.max(0, columnFromDateStr(state.weekStart, b.date))),
        start_time: b.start_time,
        end_time: b.end_time,
        label: b.label,
        type: b.type,
      }));
      return { ...state, template };
    }
    case "clearWeek":
      return {
        ...state,
        blocks: outsideWeek(state.blocks, state.weekStart),
        selectedBlockId: null,
        armedAreaId: null,
      };
    case "updateArea":
      return {
        ...state,
        areas: state.areas.map((a) =>
          a.id === action.areaId ? { ...a, ...action.patch, id: a.id } : a
        ),
      };
    case "addArea": {
      const name = action.name.trim();
      if (!name) return state;
      // Pick the least-used pattern so new areas stay distinguishable.
      const counts = new Map<string, number>(PATTERN_KEYS.map((k) => [k, 0]));
      for (const a of state.areas) {
        if (!a.archived_at) counts.set(a.pattern, (counts.get(a.pattern) ?? 0) + 1);
      }
      const pattern = PATTERN_KEYS.reduce((best, k) =>
        (counts.get(k) ?? 0) < (counts.get(best) ?? 0) ? k : best
      );
      const maxRank = Math.max(0, ...state.areas.map((a) => a.rank));
      const area: Area = {
        id: uid("area"),
        user_id: SEED_USER,
        name,
        default_type: "anchor",
        rank: maxRank + 1,
        target_hours_per_week: 2,
        pattern,
        season_end_date: null,
        success_definition: "",
        archived_at: null,
      };
      return { ...state, areas: [...state.areas, area] };
    }
    case "archiveArea":
      return {
        ...state,
        armedAreaId: state.armedAreaId === action.areaId ? null : state.armedAreaId,
        areas: state.areas.map((a) =>
          a.id === action.areaId ? { ...a, archived_at: new Date().toISOString() } : a
        ),
        // Blocks already placed stay — archiving stops future planning, it
        // doesn't rewrite history.
      };
    case "moveAreaRank": {
      const ordered = [...state.areas]
        .filter((a) => !a.archived_at)
        .sort((a, b) => a.rank - b.rank);
      const idx = ordered.findIndex((a) => a.id === action.areaId);
      const swap = idx + action.dir;
      if (idx === -1 || swap < 0 || swap >= ordered.length) return state;
      const rankA = ordered[idx].rank;
      const rankB = ordered[swap].rank;
      return {
        ...state,
        areas: state.areas.map((a) =>
          a.id === ordered[idx].id
            ? { ...a, rank: rankB }
            : a.id === ordered[swap].id
            ? { ...a, rank: rankA }
            : a
        ),
      };
    }
    case "updateSettings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "syncCommit": {
      // Demo-mode commit: apply the confirmed diff locally. The policy that
      // decides WHAT gets written lives in lib/calendar/sync.ts and is shared
      // with the real transport; only the id assignment is simulated here.
      const today = localISODate(new Date());
      const live = new Set(state.blocks.map((b) => b.id));
      let synced = [...state.syncedEvents];

      // Drop records whose block is gone, or whose sprint season has ended —
      // these are the deletions the diff showed as "cancelled"/"expired".
      synced = synced.filter((se) => {
        if (!live.has(se.blockId)) return false;
        const b = state.blocks.find((x) => x.id === se.blockId)!;
        const area = state.areas.find((a) => a.id === b.area_id);
        if (!area) return false;
        const type = b.type ?? area.default_type;
        if (type === "open") return false;
        if (type === "sprint" && area.season_end_date && b.date > area.season_end_date) {
          return false;
        }
        return true;
      });

      const blocks = state.blocks.map((b) => {
        const area = state.areas.find((a) => a.id === b.area_id);
        if (!area) return b;
        const type = b.type ?? area.default_type;
        if (type === "open") return b; // Open never syncs.
        const expired =
          type === "sprint" && area.season_end_date && b.date > area.season_end_date;
        if (expired) {
          return b.gcal_event_id
            ? { ...b, gcal_event_id: null, sync_state: "synced" as const }
            : b;
        }
        if (b.sync_state === "unsynced") {
          const gcalEventId = b.gcal_event_id ?? `demo-gcal-${b.id}`;
          if (!synced.some((se) => se.gcalEventId === gcalEventId)) {
            synced.push({
              gcalEventId,
              blockId: b.id,
              summary: b.label ?? area.name,
            });
          }
          return { ...b, gcal_event_id: gcalEventId, sync_state: "synced" as const };
        }
        return b;
      });

      return {
        ...state,
        lastSyncedAt: new Date().toISOString(),
        blocks,
        syncedEvents: synced,
      };
    }
    default:
      return state;
  }
}

// --- persistence -------------------------------------------------------------

interface PersistedState {
  areas: Area[];
  blocks: PlannedBlock[];
  template: TemplateBlock[];
  external: ExternalEvent[];
  settings: UserSettings;
  weekStart: string;
  lastSyncedAt: string | null;
  syncedEvents: SyncedEvent[];
}

function loadPersisted(): Partial<State> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedState;
    if (!Array.isArray(data.areas) || !Array.isArray(data.blocks)) return null;
    return {
      areas: data.areas,
      blocks: data.blocks,
      template: Array.isArray(data.template) ? data.template : SEED_TEMPLATE_BLOCKS,
      external: Array.isArray(data.external) ? data.external : [],
      settings: data.settings,
      weekStart: data.weekStart,
      lastSyncedAt: data.lastSyncedAt ?? null,
      syncedEvents: Array.isArray(data.syncedEvents) ? data.syncedEvents : [],
    };
  } catch {
    return null;
  }
}

// --- context -------------------------------------------------------------

interface StoreValue extends State {
  /** Blocks in the week currently in view. Most UI wants this, not `blocks`. */
  weekBlocks: PlannedBlock[];
  budget: Budget;
  syncDiff: SyncDiff;
  isCurrentWeek: boolean;
  columnFromDate: (date: string) => number;
  arm: (areaId: string | null) => void;
  select: (blockId: string | null) => void;
  place: (column: number, start: string, end: string) => void;
  toggleDone: (blockId: string) => void;
  remove: (blockId: string) => void;
  updateBlock: (blockId: string, patch: { label?: string | null; type?: BlockType }) => void;
  nudgeBlock: (blockId: string, kind: "shift" | "resize" | "day", delta: number) => void;
  applyAssistant: (actions: AssistantAction[]) => void;
  loadTemplate: () => void;
  saveToTemplate: () => void;
  clearWeek: () => void;
  shiftWeek: (delta: number) => void;
  goToCurrentWeek: () => void;
  updateArea: (areaId: string, patch: Partial<Area>) => void;
  addArea: (name: string) => void;
  archiveArea: (areaId: string) => void;
  moveAreaRank: (areaId: string, dir: -1 | 1) => void;
  updateSettings: (patch: Partial<UserSettings>) => void;
  syncCommit: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitial);

  // Hydrate from localStorage after mount (SSR-safe), then persist on change.
  useEffect(() => {
    const data = loadPersisted();
    if (data) dispatch({ t: "hydrate", data });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const persist: PersistedState = {
        areas: state.areas,
        blocks: state.blocks,
        template: state.template,
        external: state.external,
        settings: state.settings,
        weekStart: state.weekStart,
        lastSyncedAt: state.lastSyncedAt,
        syncedEvents: state.syncedEvents,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
    } catch {
      // Storage full or unavailable — the app still works, it just won't persist.
    }
  }, [
    state.areas,
    state.blocks,
    state.template,
    state.external,
    state.settings,
    state.weekStart,
    state.lastSyncedAt,
    state.syncedEvents,
  ]);

  const weekBlocks = useMemo(
    () => inWeek(state.blocks, state.weekStart),
    [state.blocks, state.weekStart]
  );

  const weekExternal = useMemo(
    () => state.external.filter((e) => {
      const end = addDays(state.weekStart, 7);
      return e.date >= state.weekStart && e.date < end;
    }),
    [state.external, state.weekStart]
  );

  const budget = useMemo(
    () =>
      computeBudget(
        state.areas,
        weekBlocks,
        weekExternal,
        state.settings.sleep_hours_per_night
      ),
    [state.areas, weekBlocks, weekExternal, state.settings]
  );

  // The dry-run diff, computed live off the SAME policy module the real
  // transport uses. "Owned" events are reconstructed from synced blocks.
  const syncDiff = useMemo(() => {
    // Built from the record of what we've written, NOT from current blocks —
    // otherwise a deleted block would take its calendar event off the books
    // and the orphan would never be cleaned up.
    const weekBlockIds = new Set(weekBlocks.map((b) => b.id));
    const existingOwned: GCalEvent[] = state.syncedEvents
      .filter(
        (se) =>
          weekBlockIds.has(se.blockId) ||
          !state.blocks.some((b) => b.id === se.blockId)
      )
      .map((se) => ({
        id: se.gcalEventId,
        summary: se.summary,
        extendedProperties: {
          private: { plannerApp: "weekmachine", plannerBlockId: se.blockId },
        },
      }));
    return computeDiff(
      weekBlocks,
      state.areas,
      existingOwned,
      weekExternal,
      localISODate(new Date())
    );
  }, [weekBlocks, state.areas, weekExternal, state.syncedEvents, state.blocks]);

  const value: StoreValue = {
    ...state,
    weekBlocks,
    budget,
    syncDiff,
    isCurrentWeek:
      state.weekStart === currentWeekStart(state.settings.week_starts_on),
    columnFromDate: useCallback(
      (date: string) => columnFromDateStr(state.weekStart, date),
      [state.weekStart]
    ),
    arm: useCallback((areaId) => dispatch({ t: "arm", areaId }), []),
    select: useCallback((blockId) => dispatch({ t: "select", blockId }), []),
    place: useCallback(
      (column, start, end) => dispatch({ t: "place", column, start, end }),
      []
    ),
    toggleDone: useCallback((blockId) => dispatch({ t: "toggleDone", blockId }), []),
    remove: useCallback((blockId) => dispatch({ t: "remove", blockId }), []),
    updateBlock: useCallback(
      (blockId, patch) => dispatch({ t: "updateBlock", blockId, patch }),
      []
    ),
    nudgeBlock: useCallback(
      (blockId, kind, delta) => dispatch({ t: "nudgeBlock", blockId, kind, delta }),
      []
    ),
    applyAssistant: useCallback(
      (actions) => dispatch({ t: "assistant", actions }),
      []
    ),
    loadTemplate: useCallback(() => dispatch({ t: "loadTemplate" }), []),
    saveToTemplate: useCallback(() => dispatch({ t: "saveToTemplate" }), []),
    clearWeek: useCallback(() => dispatch({ t: "clearWeek" }), []),
    shiftWeek: useCallback(
      (delta: number) =>
        dispatch({ t: "setWeekStart", weekStart: addDays(state.weekStart, delta * 7) }),
      [state.weekStart]
    ),
    goToCurrentWeek: useCallback(
      () =>
        dispatch({
          t: "setWeekStart",
          weekStart: currentWeekStart(state.settings.week_starts_on),
        }),
      [state.settings.week_starts_on]
    ),
    updateArea: useCallback(
      (areaId, patch) => dispatch({ t: "updateArea", areaId, patch }),
      []
    ),
    addArea: useCallback((name) => dispatch({ t: "addArea", name }), []),
    archiveArea: useCallback((areaId) => dispatch({ t: "archiveArea", areaId }), []),
    moveAreaRank: useCallback(
      (areaId, dir) => dispatch({ t: "moveAreaRank", areaId, dir }),
      []
    ),
    updateSettings: useCallback(
      (patch) => dispatch({ t: "updateSettings", patch }),
      []
    ),
    syncCommit: useCallback(() => dispatch({ t: "syncCommit" }), []),
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
  const start = Math.min(
    Math.max(slotMinutes, GRID_START_MIN),
    GRID_END_MIN - 60
  );
  return { start: toHHMM(start), end: toHHMM(start + 60) };
}
