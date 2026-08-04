import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest — makes the app installable to the Home
// Screen (Add to Home Screen on iOS, install prompt on Android/desktop).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Week Machine",
    short_name: "Week Machine",
    description:
      "Allocate your week against your priorities before it starts, and see the moment you're overcommitted.",
    start_url: "/",
    display: "standalone",
    background_color: "#3b3730",
    theme_color: "#3b3730",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
