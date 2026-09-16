import type { Metadata } from "next";

import { AdminOverviewScreen } from "@/features/admin-overview/admin-overview-screen";
import { goldenScreenFixtures } from "@/features/golden-screens/fixtures";

export const metadata: Metadata = {
  title: "Inicio | SGTA",
  description: "Contexto operativo, atención y próximas guardias de Tutorías UTN FRRe.",
};

export default function AdminOverviewPage() {
  return <AdminOverviewScreen fixture={goldenScreenFixtures.adminOverview} />;
}
