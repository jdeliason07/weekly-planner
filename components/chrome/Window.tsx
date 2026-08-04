"use client";

import type { ReactNode } from "react";
import { TITLE_STRIPES } from "@/lib/patterns";

// A classic Mac window: 1px black border, white fill, hard 2px shadow, no
// blur, no radius. The title bar is horizontal stripes with a close box at
// left and the title in a white gap that interrupts the stripes.
//
// `scroll` controls whether the window body scrolls. Set it false when the
// child manages its own scrolling (the week grid does), so you never get two
// nested scrollers fighting each other.
export function Window({
  title,
  children,
  className = "",
  bodyClassName = "",
  scroll = true,
  onClose,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  scroll?: boolean;
  onClose?: () => void;
}) {
  return (
    <div
      className={`flex min-h-0 flex-col border border-black bg-white ${className}`}
      style={{ boxShadow: "2px 2px 0 #000" }}
    >
      <TitleBar title={title} onClose={onClose} />
      <div
        className={`flex min-h-0 flex-1 flex-col bg-white ${
          scroll ? "overflow-auto" : "overflow-hidden"
        } ${bodyClassName}`}
      >
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
      className="relative flex h-[20px] shrink-0 items-center border-b border-black"
      style={TITLE_STRIPES}
    >
      {/* Close box — 11px square, white with a black border. */}
      <button
        type="button"
        onClick={onClose}
        aria-label={onClose ? `Close ${title}` : undefined}
        disabled={!onClose}
        className="ml-1.5 h-[11px] w-[11px] border border-black bg-white disabled:cursor-default"
        tabIndex={onClose ? 0 : -1}
      />
      {/* Title sits in a white padded gap that interrupts the stripes. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span
          className="bg-white px-2 font-chrome text-black"
          style={{ fontSize: 9, letterSpacing: "0.04em" }}
        >
          {title}
        </span>
      </div>
    </div>
  );
}
