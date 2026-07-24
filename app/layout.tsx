import type { Metadata } from "next";
import { Silkscreen } from "next/font/google";
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
  description: "A weekly planning tool that shows you when you're overcommitted.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={silkscreen.variable}>
      <body>{children}</body>
    </html>
  );
}
