import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Inter, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { THEME_BOOT_SCRIPT } from "@/hooks/useTheme";
import { Providers } from "./providers";
import "./globals.css";

// UI typefaces the style presets (and the Settings → Appearance font picker) choose between: globals.css [data-typeface].
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex", display: "swap" });

export const metadata: Metadata = {
  title: { default: "TaskFlow", template: "%s · TaskFlow" },
  description: "TaskFlow: one workspace for help desk, operations, billing, logistics, clinics, and people.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jakarta.variable} ${plex.variable}`}>
      <head>
        {/* Applies the saved theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
