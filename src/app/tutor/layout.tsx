import type { ReactNode } from "react";

import { AppSidebar } from "@/shared/components/app-sidebar";
import { PageContainer } from "@/shared/components/page-container";

export default function TutorLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-svh bg-canvas">
      <AppSidebar variant="tutor" />
      <div className="min-w-0 flex-1">
        <a
          href="#tutor-main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-60 focus:rounded-md focus:bg-surface focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-sm"
        >
          Saltar al contenido principal
        </a>
        <PageContainer
          as="main"
          id="tutor-main-content"
          className="min-h-svh pt-20 md:pt-6"
        >
          {children}
        </PageContainer>
      </div>
    </div>
  );
}
