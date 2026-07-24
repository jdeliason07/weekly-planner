"use client";

// The menu bar replaces tabs entirely. 20px tall, black bottom border, a ✳ at
// far left. Items invert when active — black fill, white text.

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
    <div className="flex h-5 shrink-0 items-stretch border-b border-black bg-white">
      <div
        aria-hidden
        className="flex items-center px-2 font-chrome text-black"
        style={{ fontSize: 11 }}
      >
        ✳
      </div>
      <nav className="flex items-stretch" aria-label="Main">
        {items.map((it) => {
          const isActive = it.key === active;
          return (
            <button
              key={it.key}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelect(it.key)}
              className={`px-2 font-chrome ${
                isActive ? "bg-black text-white" : "bg-white text-black"
              }`}
              style={{ fontSize: 9, letterSpacing: "0.03em" }}
            >
              {it.label}
            </button>
          );
        })}
      </nav>
      {right ? <div className="ml-auto flex items-stretch">{right}</div> : null}
    </div>
  );
}
