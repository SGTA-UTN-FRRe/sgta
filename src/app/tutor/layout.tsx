import type { ReactNode } from 'react';
import { AppSidebar } from '@/shared/components/app-sidebar';

export default function TutorLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <AppSidebar variant="tutor" />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-6 md:px-8">
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
            Portal del Tutor • SGTA
          </span>
        </header>
        <main className="flex-1 p-6 md:p-8 max-w-[100rem] w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
