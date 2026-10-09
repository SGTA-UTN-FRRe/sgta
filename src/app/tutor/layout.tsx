import type { ReactNode } from "react";

import { requireRole } from "@/auth/authorization";
import { AppShell } from "@/shared/components/app-shell";

export default async function TutorLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await requireRole("TUTOR");

  return (
    <AppShell role="tutor" user={{ name: user.name, role: user.role }}>
      {children}
    </AppShell>
  );
}
