"use client";

// Registers the service worker so the app works from the Home Screen.
import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failing (e.g. unsupported browser) never breaks the app.
      });
    }
  }, []);
  return null;
}
