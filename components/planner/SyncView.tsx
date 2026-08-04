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
  const [confirmed, setConfirmed] = useState(false);

  const total = diff.created.length + diff.moved.length + diff.expired.length;

  function commit() {
    store.syncCommit();
    setConfirmed(true);
  }

  return (
    <div className="flex h-full items-start justify-center overflow-auto p-1">
      <Window title="Sync to calendar" className="w-full max-w-[460px]">
        <div className="p-3">
          {/* The diff. */}
          <div className="border border-black">
            <DiffSection sign="+" label={`${diff.created.length} new block${diff.created.length === 1 ? "" : "s"}`} lines={diff.created} />
            <DiffSection sign="~" label={`${diff.moved.length} moved`} lines={diff.moved} />
            <DiffSection sign="−" label={`${diff.expired.length} expired (Sprint season ended)`} lines={diff.expired} />
            <div className="flex items-center gap-2 px-2 py-1">
              <span className="w-3 shrink-0 text-center font-chrome" style={{ fontSize: 10 }}>
                {" "}
              </span>
              <span className="font-prose text-black" style={{ fontSize: 11 }}>
                Untouched: {diff.untouchedCount} existing calendar event
                {diff.untouchedCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <p className="mt-2 font-prose text-black" style={{ fontSize: 10, lineHeight: 1.4 }}>
            Only events created by Week Machine are ever written. Open blocks
            stay off the calendar. Nothing happens until you confirm.
          </p>

          {confirmed && total === 0 ? (
            <p className="mt-2 border border-black bg-black px-2 py-1 font-chrome text-white" style={{ fontSize: 9 }}>
              SYNCED.
            </p>
          ) : null}

          <div className="mt-3 flex items-center justify-between">
            <span className="font-chrome text-black" style={{ fontSize: 8 }}>
              {store.lastSyncedAt
                ? `LAST SYNC ${new Date(store.lastSyncedAt).toLocaleString()}`
                : "NEVER SYNCED"}
            </span>
            <MacBtn primary disabled={total === 0} onClick={commit}>
              SYNC TO CALENDAR
            </MacBtn>
          </div>

          <p className="mt-3 border-t border-black pt-2 font-prose text-black" style={{ fontSize: 10, lineHeight: 1.4 }}>
            Google Calendar isn&apos;t connected yet, so confirming applies the
            sync locally. Connect Google in SETUP.md and writes go through the
            same diff → confirm path, tagged and ownership-checked.
          </p>
        </div>
      </Window>
    </div>
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
  return (
    <div className="border-b border-black">
      <div className="flex items-center gap-2 px-2 py-1">
        <span className="w-3 shrink-0 text-center font-chrome text-black" style={{ fontSize: 10 }}>
          {sign}
        </span>
        <span className="font-prose text-black" style={{ fontSize: 11 }}>
          {label}
        </span>
      </div>
      {lines.map((l) => {
        const block = store.blocks.find((b) => b.id === l.blockId);
        const area = block
          ? store.areas.find((a) => a.id === block.area_id)
          : undefined;
        return (
          <div key={l.blockId} className="flex items-center gap-2 py-[2px] pl-7 pr-2">
            {area && (
              <span
                aria-hidden
                className="h-3 w-3 shrink-0 border border-black"
                style={patternStyle(area.pattern)}
              />
            )}
            <span className="truncate font-prose text-black" style={{ fontSize: 10 }}>
              {l.label}
              {block ? ` — ${block.date.slice(5)} ${block.start_time}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
