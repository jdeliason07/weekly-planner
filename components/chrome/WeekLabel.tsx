"use client";

// The chin label. Shows today's date — the week you're *viewing* is named by
// the week navigator inside the screen, so this stays a fixed reference
// point. Computed client-side after mount: the page is statically
// prerendered, so a server-rendered date would freeze at build time.

import { useEffect, useState } from "react";

export function WeekLabel() {
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel(
      new Date()
        .toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
        .toUpperCase()
    );
  }, []);

  return <>{label ? `TODAY IS ${label}` : ""}</>;
}
