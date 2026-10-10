import type { Metadata } from "next";

import { getDatabase } from "@/db/client";
import { AdminOverviewScreen } from "@/features/admin-overview/admin-overview-screen";
import { buildAdminOverviewViewModel, emptyScreenData, overviewFailure } from "@/features/admin-overview/attention";
import { getAdminOverviewCurrentDate, getAdminOverviewReadModel } from "@/features/admin-overview/admin-overview-service";

export const metadata: Metadata = {
  title: "Inicio | SGTA",
  description: "Resumen operativo del ciclo administrativo vigente.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  let overview;
  try {
    const model = await getAdminOverviewReadModel(getDatabase());
    overview = buildAdminOverviewViewModel(model);
  } catch {
    const data = {
      ...emptyScreenData(getAdminOverviewCurrentDate()),
      upcomingFailure: overviewFailure(
        "overview-load-failed",
        "No se pudo cargar el cronograma",
        "Reintentar para volver a consultar el ciclo y las guardias.",
        "/admin",
        "Reintentar",
      ),
    };
    overview = { data, state: "error" as const };
  }
  return <AdminOverviewScreen data={overview.data} state={overview.state} />;
}
