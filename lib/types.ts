// Domain types. These mirror the Postgres schema in
// supabase/migrations/0001_init.sql. Times are "HH:MM" 24h strings on a
// 06:00–23:00 planning grid. Days are 0–6 where 0 is the user's week start.

import type { PatternKey } from "./patterns";

export type BlockType = "anchor" | "sprint" | "open";

export type SyncState = "unsynced" | "synced" | "pending_delete";

export interface Area {
  id: string;
  user_id: string;
  name: string;
  default_type: BlockType;
  rank: number;
  target_hours_per_week: number;
  pattern: PatternKey;
  season_end_date: string | null; // "YYYY-MM-DD"
  success_definition: string;
  archived_at: string | null;
}

export interface TemplateBlock {
  id: string;
  user_id: string;
  area_id: string;
  day_of_week: number; // 0–6
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  label: string | null;
  type: BlockType | null; // inherits area default when null
}

export type WeekStatus = "draft" | "synced";

export interface WeekPlan {
  id: string;
  user_id: string;
  week_start_date: string; // "YYYY-MM-DD"
  status: WeekStatus;
}

export interface PlannedBlock {
  id: string;
  week_plan_id: string;
  area_id: string;
  date: string; // "YYYY-MM-DD" — the concrete day this block lands on
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  label: string | null;
  type: BlockType;
  gcal_event_id: string | null;
  sync_state: SyncState;
  completed_at: string | null;
}

export interface ChatMessage {
  id: string;
  week_plan_id: string;
  role: "user" | "assistant";
  content: string;
  actions_applied: number;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  sleep_hours_per_night: number;
  week_starts_on: number; // 0 = Sunday
  timezone: string; // IANA
}

// A calendar event read from Google. Locked on the grid — never modified
// unless it carries our plannerApp tag (see lib/calendar/ownership.ts).
export interface ExternalEvent {
  gcal_event_id: string;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  // true only when this event was created by Week Machine (tagged).
  ownedByApp: boolean;
}

// The effective type of a placed block (falls back to the area default).
export function effectiveType(
  block: { type: BlockType | null },
  area: { default_type: BlockType }
): BlockType {
  return block.type ?? area.default_type;
}
