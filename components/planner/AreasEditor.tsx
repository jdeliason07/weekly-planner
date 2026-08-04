"use client";

// The AREAS view: create, rank, and edit life areas — and the user settings
// that feed the budget (sleep, week start, timezone). Editing here reshapes
// the budget meter immediately; blocks already placed keep their history.

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Window } from "@/components/chrome/Window";
import { MacBtn } from "@/components/chrome/MacBtn";
import { patternStyle } from "@/lib/patterns";
import { fmtHours } from "@/lib/budget";
import type { Area, BlockType } from "@/lib/types";

const TYPE_ORDER: BlockType[] = ["anchor", "sprint", "open"];
const TYPE_LABEL: Record<BlockType, string> = {
  anchor: "ANCHOR",
  sprint: "SPRINT",
  open: "OPEN",
};

export function AreasEditor() {
  const store = useStore();
  const [newName, setNewName] = useState("");
  const active = store.budget.perArea;

  function addArea() {
    const name = newName.trim();
    if (!name) return;
    store.addArea(name);
    setNewName("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto lg:flex-row lg:overflow-visible">
      <Window title="Areas" className="shrink-0 lg:min-h-0 lg:flex-1">
        <div className="flex flex-col">
          {active.map(({ area, placedHours }, i) => (
            <AreaRow
              key={area.id}
              area={area}
              placedHours={placedHours}
              isFirst={i === 0}
              isLast={i === active.length - 1}
            />
          ))}

          {/* Add a new area */}
          <div className="flex items-center gap-1 border-t border-black p-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addArea();
              }}
              placeholder="New area name"
              aria-label="New area name"
              className="min-w-0 flex-1 border border-black bg-white px-1 py-1 font-prose text-black"
              style={{ fontSize: 11 }}
            />
            <MacBtn primary onClick={addArea} disabled={!newName.trim()}>
              ADD AREA
            </MacBtn>
          </div>
        </div>
      </Window>

      <SettingsWindow />
    </div>
  );
}

function AreaRow({
  area,
  placedHours,
  isFirst,
  isLast,
}: {
  area: Area;
  placedHours: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const store = useStore();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-black p-1.5">
      {/* Row 1: pattern, name, rank */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-7 w-[10px] shrink-0 border border-black"
          style={patternStyle(area.pattern)}
        />
        <input
          value={area.name}
          onChange={(e) => store.updateArea(area.id, { name: e.target.value })}
          aria-label={`Name for ${area.name}`}
          className="min-w-0 flex-1 border border-black bg-white px-1.5 py-1 font-prose text-black"
          style={{ fontSize: 12 }}
        />
        <div className="flex shrink-0 flex-col gap-[2px]">
          <MacBtn
            disabled={isFirst}
            onClick={() => store.moveAreaRank(area.id, -1)}
            aria-label={`Rank ${area.name} higher`}
            className="!px-1.5 !py-0"
          >
            ▲
          </MacBtn>
          <MacBtn
            disabled={isLast}
            onClick={() => store.moveAreaRank(area.id, 1)}
            aria-label={`Rank ${area.name} lower`}
            className="!px-1.5 !py-0"
          >
            ▼
          </MacBtn>
        </div>
      </div>

      {/* Row 2: target, type, placed, more */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-[18px]">
        <label className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            step={0.5}
            value={area.target_hours_per_week}
            onChange={(e) =>
              store.updateArea(area.id, {
                target_hours_per_week: Math.max(0, Number(e.target.value) || 0),
              })
            }
            aria-label={`Weekly hour target for ${area.name}`}
            className="w-14 border border-black bg-white px-1 py-1 text-right font-chrome text-black"
            style={{ fontSize: 10 }}
          />
          <span className="font-chrome text-black" style={{ fontSize: 8 }}>
            H/WK
          </span>
        </label>
        <MacBtn
          onClick={() => {
            const next =
              TYPE_ORDER[
                (TYPE_ORDER.indexOf(area.default_type) + 1) % TYPE_ORDER.length
              ];
            store.updateArea(area.id, { default_type: next });
          }}
          title="Default type for new blocks — type still lives on each block"
        >
          {TYPE_LABEL[area.default_type]}
        </MacBtn>
        <span className="font-chrome text-black" style={{ fontSize: 8 }}>
          {fmtHours(placedHours)}H PLACED
        </span>
        {area.season_end_date && (
          <span className="font-chrome text-black" style={{ fontSize: 8 }}>
            · ENDS {area.season_end_date.slice(5)}
          </span>
        )}
        <MacBtn
          active={expanded}
          onClick={() => setExpanded(!expanded)}
          className="ml-auto"
        >
          {expanded ? "LESS" : "MORE"}
        </MacBtn>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2 border-t border-black pt-2">
          <label className="block">
            <span className="font-chrome text-black" style={{ fontSize: 8 }}>
              SUCCESS LOOKS LIKE
            </span>
            <textarea
              value={area.success_definition}
              onChange={(e) =>
                store.updateArea(area.id, { success_definition: e.target.value })
              }
              rows={2}
              placeholder="The honest bar for this season."
              className="mt-1 w-full border border-black bg-white px-1.5 py-1 font-prose text-black"
              style={{ fontSize: 11 }}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1">
              <span className="font-chrome text-black" style={{ fontSize: 8 }}>
                SEASON END
              </span>
              <input
                type="date"
                value={area.season_end_date ?? ""}
                onChange={(e) =>
                  store.updateArea(area.id, {
                    season_end_date: e.target.value || null,
                  })
                }
                className="border border-black bg-white px-1 py-1 font-prose text-black"
                style={{ fontSize: 10 }}
              />
            </label>
            <MacBtn
              className="ml-auto"
              onClick={() => store.archiveArea(area.id)}
              title="Stops future planning for this area. Placed blocks keep their history."
            >
              ARCHIVE
            </MacBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsWindow() {
  const store = useStore();
  const s = store.settings;

  return (
    <Window title="Settings" className="shrink-0 lg:w-[240px]">
      <div className="space-y-3 p-2">
        <label className="block">
          <span className="font-chrome text-black" style={{ fontSize: 8 }}>
            SLEEP HOURS PER NIGHT
          </span>
          <input
            type="number"
            min={4}
            max={12}
            step={0.5}
            value={s.sleep_hours_per_night}
            onChange={(e) =>
              store.updateSettings({
                sleep_hours_per_night: Math.min(
                  12,
                  Math.max(4, Number(e.target.value) || 8)
                ),
              })
            }
            className="mt-1 w-full border border-black bg-white px-1 py-1 text-right font-chrome text-black"
            style={{ fontSize: 10 }}
          />
        </label>

        <div>
          <span className="font-chrome text-black" style={{ fontSize: 8 }}>
            WEEK STARTS ON
          </span>
          <div className="mt-1 flex gap-1">
            <MacBtn
              active={s.week_starts_on === 0}
              onClick={() => store.updateSettings({ week_starts_on: 0 })}
              className="flex-1"
            >
              SUNDAY
            </MacBtn>
            <MacBtn
              active={s.week_starts_on === 1}
              onClick={() => store.updateSettings({ week_starts_on: 1 })}
              className="flex-1"
            >
              MONDAY
            </MacBtn>
          </div>
        </div>

        <label className="block">
          <span className="font-chrome text-black" style={{ fontSize: 8 }}>
            TIMEZONE (IANA)
          </span>
          <input
            value={s.timezone}
            onChange={(e) => store.updateSettings({ timezone: e.target.value })}
            className="mt-1 w-full border border-black bg-white px-1 py-1 font-prose text-black"
            style={{ fontSize: 11 }}
          />
          <span
            className="mt-1 block font-prose text-black"
            style={{ fontSize: 9, lineHeight: 1.3 }}
          >
            Sent explicitly with every calendar write so events never drift.
          </span>
        </label>
      </div>
    </Window>
  );
}
