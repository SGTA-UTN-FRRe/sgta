import type { Metadata } from "next";

import { AdminOverviewScreen } from "@/features/admin-overview/admin-overview-screen";
import { adminOverviewScreenData } from "@/mocks/admin-overview.mock";

export const metadata: Metadata = {
  title: "Inicio | SGTA",
  description: "Contexto operativo, atención y próximas guardias de Tutorías UTN FRRe.",
};

export default function AdminOverviewPage() {
  return <AdminOverviewScreen data={adminOverviewScreenData} />;
}
