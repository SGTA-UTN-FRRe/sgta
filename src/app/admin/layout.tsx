import type { ReactNode } from "react";

import { requireRole } from "@/auth/authorization";
import { AppShell } from "@/shared/components/app-shell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await requireRole("ADMIN");

  return (
    <AppShell role="admin" user={{ name: user.name, role: user.role }}>
      {children}
    </AppShell>
  );
}
