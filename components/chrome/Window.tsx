"use client";

import type { ReactNode } from "react";
import { TITLE_STRIPES } from "@/lib/patterns";

// A classic Mac window: 1px black border, white fill, hard 2px shadow, no
// blur, no radius. The title bar is 19px of horizontal stripes with a close
// box at left and the title in a white gap that interrupts the stripes.
export function Window({
  title,
  children,
  className = "",
  bodyClassName = "",
  onClose,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  onClose?: () => void;
}) {
  return (
    <div
      className={`flex min-h-0 flex-col border border-black bg-white ${className}`}
      style={{ boxShadow: "2px 2px 0 #000" }}
    >
      <TitleBar title={title} onClose={onClose} />
      <div className={`min-h-0 flex-1 overflow-auto bg-white ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}

export function TitleBar({
  title,
  onClose,
}: {
  title: string;
  onClose?: () => void;
}) {
  return (
    <div
      className="relative flex h-[19px] shrink-0 items-center border-b border-black"
      style={TITLE_STRIPES}
    >
      {/* Close box — 11px square, white with a black border. */}
      <button
        type="button"
        onClick={onClose}
        aria-label={onClose ? `Close ${title}` : undefined}
        disabled={!onClose}
        className="ml-1 h-[11px] w-[11px] border border-black bg-white disabled:cursor-default"
        tabIndex={onClose ? 0 : -1}
      />
      {/* Title sits in a white padded gap that interrupts the stripes. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span
          className="bg-white px-2 font-chrome text-black"
          style={{ fontSize: 9, letterSpacing: "0.03em" }}
        >
          {title}
        </span>
      </div>
    </div>
  );
}
