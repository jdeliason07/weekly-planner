"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

// A Mac button: 7px radius, 1px black border, white fill. The PRIMARY button
// in any view uses a 3px double border instead. Disabled drops to 35%.
// Selection/active is inversion — black fill, white text — never a color.
export function MacBtn({
  children,
  primary = false,
  active = false,
  className = "",
  ...props
}: {
  children: ReactNode;
  primary?: boolean;
  active?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-btn px-2 py-[3px] font-chrome disabled:opacity-35 ${
        active ? "bg-black text-white" : "bg-white text-black"
      } ${className}`}
      style={{
        fontSize: 9,
        letterSpacing: "0.03em",
        border: primary ? "3px double #000" : "1px solid #000",
        ...props.style,
      }}
    >
      {children}
    </button>
  );
}
