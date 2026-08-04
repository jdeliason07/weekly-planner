"use client";

// The chin's week label. Computed client-side after mount — the page is
// statically prerendered, so a server-rendered date would be frozen at build
// time (and in the builder's timezone).

import { useEffect, useState } from "react";

export function WeekLabel() {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const now = new Date();
    setLabel(
      now
        .toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
        .toUpperCase()
    );
  }, []);

  return <>WEEK OF {label}</>;
}
