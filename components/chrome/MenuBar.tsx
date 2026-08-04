"use client";

// The menu bar replaces tabs entirely. A ✳ at far left, items that invert
// when active — black fill, white text, never a highlight color.

export interface MenuItem {
  key: string;
  label: string;
}

export function MenuBar({
  items,
  active,
  onSelect,
  right,
}: {
  items: MenuItem[];
  active: string;
  onSelect: (key: string) => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="relative z-40 flex h-7 shrink-0 items-stretch border-b border-black bg-white">
      <div
        aria-hidden
        className="flex items-center px-2 font-chrome text-black"
        style={{ fontSize: 12 }}
      >
        ✳
      </div>
      <nav className="flex min-w-0 flex-1 items-stretch" aria-label="Main">
        {items.map((it) => {
          const isActive = it.key === active;
          return (
            <button
              key={it.key}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelect(it.key)}
              className={`whitespace-nowrap px-2 font-chrome sm:px-2.5 ${
                isActive ? "bg-black text-white" : "bg-white text-black"
              }`}
              style={{ fontSize: 9, letterSpacing: "0.03em" }}
            >
              {it.label}
            </button>
          );
        })}
      </nav>
      {right ? <div className="flex items-stretch">{right}</div> : null}
    </div>
  );
}
