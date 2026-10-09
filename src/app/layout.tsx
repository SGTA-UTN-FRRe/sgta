import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope, Source_Serif_4 } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HydrationMarker } from "@/shared/hydration-marker";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-ui",
  weight: ["400", "500", "600", "700", "800"],
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-heading",
  weight: "600",
  fallback: ["ui-serif", "Georgia", "serif"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SGTA | Sistema de Gestión de Tutorías",
  description: "Sistema de Gestión de Tutorías.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" className={`${manrope.variable} ${sourceSerif.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        <HydrationMarker />
      </body>
    </html>
  );
}
