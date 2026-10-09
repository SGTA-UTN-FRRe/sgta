import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, Figtree } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HydrationMarker } from "@/shared/hydration-marker";

import "./globals.css";

const figtree = Figtree({
  variable: "--font-ui",
  weight: ["400", "500", "600", "700", "800"],
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  subsets: ["latin"],
  display: "swap",
});

// Loaded at 700 and 800 only, so `font-semibold` headings resolve to the bold cut.
const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-heading",
  weight: ["700", "800"],
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SGTA | Sistema de Gestión de Tutorías",
  description: "Sistema de Gestión de Tutorías.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" className={`${figtree.variable} ${bricolageGrotesque.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        <HydrationMarker />
      </body>
    </html>
  );
}
