// The eleven seeded areas, exactly as specified in the brief and prototype.
// These are inserted for a new user on first run (and used directly in
// DEMO mode). Type lives on the block — default_type here is only the
// default a new block inherits.

import type { Area, TemplateBlock } from "./types";

export const SEED_USER = "demo-user";

// Season dates use the current fall semester (2026).
const DEC_18 = "2026-12-18";
const NOV_7 = "2026-11-07";

export const SEED_AREAS: Area[] = [
  {
    id: "school",
    user_id: SEED_USER,
    name: "School",
    default_type: "anchor",
    rank: 1,
    target_hours_per_week: 35,
    pattern: "solid",
    season_end_date: null,
    success_definition: "An A in ACC 310 and FIN 201. Low B's elsewhere are fine.",
    archived_at: null,
  },
  {
    id: "korvo",
    user_id: SEED_USER,
    name: "Korvo",
    default_type: "sprint",
    rank: 2,
    target_hours_per_week: 7,
    pattern: "diagR",
    season_end_date: DEC_18,
    success_definition: "Finish Uncle Rob's case study. No new clients this semester.",
    archived_at: null,
  },
  {
    id: "race-against-cancers",
    user_id: SEED_USER,
    name: "Race Against Cancers",
    default_type: "sprint",
    rank: 3,
    target_hours_per_week: 5,
    pattern: "checker",
    season_end_date: NOV_7,
    success_definition: "100 racers and 1–5 sponsors on race day.",
    archived_at: null,
  },
  {
    id: "scriptures-prayer",
    user_id: SEED_USER,
    name: "Scriptures & Prayer",
    default_type: "anchor",
    rank: 4,
    target_hours_per_week: 3.5,
    pattern: "horiz",
    season_end_date: null,
    success_definition: "Daily, unhurried. Showed up more days than I missed.",
    archived_at: null,
  },
  {
    id: "water-tower",
    user_id: SEED_USER,
    name: "Water Tower",
    default_type: "anchor",
    rank: 5,
    target_hours_per_week: 1,
    pattern: "dotsDense",
    season_end_date: null,
    success_definition: "One hour of steady upkeep. Nothing slips.",
    archived_at: null,
  },
  {
    id: "chica",
    user_id: SEED_USER,
    name: "Chica",
    default_type: "open",
    rank: 6,
    target_hours_per_week: 8,
    pattern: "diagL",
    season_end_date: null,
    success_definition: "Protected time, present. Friday swing dancing is real and on the calendar.",
    archived_at: null,
  },
  {
    id: "social",
    user_id: SEED_USER,
    name: "Social",
    default_type: "open",
    rank: 7,
    target_hours_per_week: 6,
    pattern: "dots",
    season_end_date: null,
    success_definition: "Saw people I care about. Didn't disappear into work.",
    archived_at: null,
  },
  {
    id: "ministering",
    user_id: SEED_USER,
    name: "Ministering",
    default_type: "open",
    rank: 8,
    target_hours_per_week: 3,
    pattern: "cross",
    season_end_date: null,
    success_definition: "Reached out. Followed through on the ones I said I would.",
    archived_at: null,
  },
  {
    id: "health-wellness",
    user_id: SEED_USER,
    name: "Health & Wellness",
    default_type: "anchor",
    rank: 9,
    target_hours_per_week: 6,
    pattern: "vert",
    season_end_date: null,
    success_definition: "Moved my body most days. Slept enough to think straight.",
    archived_at: null,
  },
  {
    id: "hourly-job",
    user_id: SEED_USER,
    name: "Hourly Job",
    default_type: "anchor",
    rank: 10,
    target_hours_per_week: 10,
    pattern: "diagWide",
    season_end_date: null,
    success_definition: "Ten hours in, reliable shifts, rent covered.",
    archived_at: null,
  },
  {
    id: "podcast",
    user_id: SEED_USER,
    name: "Podcast",
    default_type: "sprint",
    rank: 11,
    target_hours_per_week: 3,
    pattern: "checkerBig",
    season_end_date: DEC_18,
    success_definition: "Ship an episode a week through the season, then reassess.",
    archived_at: null,
  },
];

// A small starter template so the grid isn't empty on first look. Concrete
// blocks Jack would adjust — not prescriptive. day_of_week 0 == week start.
export const SEED_TEMPLATE_BLOCKS: TemplateBlock[] = [
  // School — weekday mornings/afternoons
  tb("t1", "school", 1, "09:00", "12:00", "Lectures"),
  tb("t2", "school", 1, "14:00", "17:00", "Study"),
  tb("t3", "school", 2, "09:00", "12:00", "Lectures"),
  tb("t4", "school", 3, "09:00", "12:00", "Lectures"),
  tb("t5", "school", 3, "14:00", "17:00", "Study"),
  tb("t6", "school", 4, "09:00", "12:00", "Lectures"),
  tb("t7", "school", 5, "10:00", "14:00", "Deep work"),
  // Hourly Job
  tb("t8", "hourly-job", 2, "16:00", "21:00", "Shift"),
  tb("t9", "hourly-job", 4, "16:00", "21:00", "Shift"),
  // Korvo — Uncle Rob case study
  tb("t10", "korvo", 1, "19:00", "21:00", "Uncle Rob"),
  tb("t11", "korvo", 3, "19:00", "21:00", "Uncle Rob"),
  // Scriptures & Prayer — daily half hour
  tb("t12", "scriptures-prayer", 1, "07:00", "07:30", null),
  tb("t13", "scriptures-prayer", 2, "07:00", "07:30", null),
  tb("t14", "scriptures-prayer", 3, "07:00", "07:30", null),
  tb("t15", "scriptures-prayer", 4, "07:00", "07:30", null),
  // Health & Wellness
  tb("t16", "health-wellness", 1, "17:30", "18:30", "Gym"),
  tb("t17", "health-wellness", 3, "17:30", "18:30", "Gym"),
  tb("t18", "health-wellness", 6, "08:00", "10:00", "Long run"),
  // Chica — OPEN reserve + the real Friday swing dancing (an anchor on an open area)
  open("t19", "chica", 0, "18:00", "21:00", "Chica time"),
  { ...tb("t20", "chica", 5, "19:00", "21:00", "Swing dancing"), type: "anchor" },
  // Social — open reserve
  open("t21", "social", 5, "21:30", "23:00", "Out"),
  // Water Tower
  tb("t22", "water-tower", 4, "12:00", "13:00", "Upkeep"),
];

function tb(
  id: string,
  area_id: string,
  day: number,
  start: string,
  end: string,
  label: string | null
): TemplateBlock {
  return {
    id,
    user_id: SEED_USER,
    area_id,
    day_of_week: day,
    start_time: start,
    end_time: end,
    label,
    type: null,
  };
}

function open(
  id: string,
  area_id: string,
  day: number,
  start: string,
  end: string,
  label: string | null
): TemplateBlock {
  return { ...tb(id, area_id, day, start, end, label), type: "open" };
}
