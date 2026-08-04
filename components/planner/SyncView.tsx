"use client";

// The SYNC view. Sync is always two steps: the dry-run diff first — computed
// by the same policy module (lib/calendar/sync.computeDiff) the real
// transport uses — then a confirmed commit. The untouched count is shown
// deliberately: it bounds the blast radius. Open blocks never appear here.

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Window } from "@/components/chrome/Window";
import { MacBtn } from "@/components/chrome/MacBtn";
import { patternStyle } from "@/lib/patterns";
import type { DiffLine } from "@/lib/calendar/sync";

export function SyncView() {
  const store = useStore();
  const diff = store.syncDiff;
  const [justSynced, setJustSynced] = useState(false);

  const total = diff.created.length + diff.moved.length + diff.expired.length;
  const openCount = store.blocks.filter((b) => b.type === "open").length;

  function commit() {
    store.syncCommit();
    setJustSynced(true);
  }

  return (
    <Window title="Sync to calendar" className="min-h-0 flex-1">
      <div className="mx-auto w-full max-w-[520px] p-3">
        {justSynced && (
          <div className="mb-3 border border-black bg-black px-2 py-1.5">
            <span className="font-chrome text-white" style={{ fontSize: 10 }}>
              SYNCED.
            </span>
          </div>
        )}

        {total === 0 ? (
          <div className="border border-black p-4 text-center">
            <p
              className="font-prose text-black"
              style={{ fontSize: 12, lineHeight: 1.4 }}
            >
              Your calendar matches your plan. Nothing to send.
            </p>
          </div>
        ) : (
          <div className="border border-black">
            <DiffSection
              sign="+"
              label={`${diff.created.length} new block${diff.created.length === 1 ? "" : "s"}`}
              lines={diff.created}
            />
            <DiffSection sign="~" label={`${diff.moved.length} moved`} lines={diff.moved} />
            <DiffSection
              sign="−"
              label={`${diff.expired.length} expired (Sprint season ended)`}
              lines={diff.expired}
            />
            <div className="flex items-center gap-2 px-2 py-1.5">
              <span className="w-3 shrink-0" />
              <span className="font-prose text-black" style={{ fontSize: 11 }}>
                Untouched: {diff.untouchedCount} existing calendar event
                {diff.untouchedCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        )}

        <p
          className="mt-3 font-prose text-black"
          style={{ fontSize: 10, lineHeight: 1.45 }}
        >
          Week Machine only ever writes events it created. Anything else on
          your calendar is read-only, permanently.
          {openCount > 0
            ? ` Your ${openCount} open block${openCount === 1 ? "" : "s"} stay off the calendar on purpose.`
            : ""}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="font-chrome text-black" style={{ fontSize: 8 }}>
            {store.lastSyncedAt
              ? `LAST SYNC ${new Date(store.lastSyncedAt).toLocaleString()}`
              : "NEVER SYNCED"}
          </span>
          <MacBtn primary disabled={total === 0} onClick={commit}>
            SYNC TO CALENDAR
          </MacBtn>
        </div>

        <p
          className="mt-3 border-t border-black pt-2 font-prose text-black"
          style={{ fontSize: 10, lineHeight: 1.45 }}
        >
          Google Calendar isn&apos;t connected yet, so confirming applies the
          sync locally. Connect Google in SETUP.md and writes go through this
          same diff, tagged and ownership-checked.
        </p>
      </div>
    </Window>
  );
}

function DiffSection({
  sign,
  label,
  lines,
}: {
  sign: string;
  label: string;
  lines: DiffLine[];
}) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const shown = open ? lines : lines.slice(0, 4);

  return (
    <div className="border-b border-black">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span
          className="w-3 shrink-0 text-center font-chrome text-black"
          style={{ fontSize: 11 }}
        >
          {sign}
        </span>
        <span className="font-prose text-black" style={{ fontSize: 11 }}>
          {label}
        </span>
      </div>
      {shown.map((l) => {
        const block = store.blocks.find((b) => b.id === l.blockId);
        const area = block
          ? store.areas.find((a) => a.id === block.area_id)
          : undefined;
        return (
          <div
            key={l.blockId}
            className="flex items-center gap-2 py-[2px] pl-7 pr-2"
          >
            {area && (
              <span
                aria-hidden
                className="h-3 w-3 shrink-0 border border-black"
                style={patternStyle(area.pattern)}
              />
            )}
            <span
              className="truncate font-prose text-black"
              style={{ fontSize: 10 }}
            >
              {l.label}
              {block ? ` — ${block.date.slice(5)} ${block.start_time}` : ""}
            </span>
          </div>
        );
      })}
      {lines.length > 4 && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="mb-1 ml-7 font-chrome text-black underline"
          style={{ fontSize: 8 }}
        >
          {open ? "SHOW LESS" : `SHOW ALL ${lines.length}`}
        </button>
      )}
    </div>
  );
}
