import type { Metadata, Viewport } from "next";
import { Silkscreen } from "next/font/google";
import { SwRegister } from "@/components/SwRegister";
import "./globals.css";

// Silkscreen — the Chicago proxy. All chrome.
const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-silkscreen",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Week Machine",
  description:
    "A weekly planning tool that shows you when you're overcommitted.",
  applicationName: "Week Machine",
  appleWebApp: {
    capable: true,
    title: "Week Machine",
    statusBarStyle: "black",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b3730",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={silkscreen.variable}>
      <body>
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
