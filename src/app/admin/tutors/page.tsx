import type { Metadata } from "next";

import { getDatabase } from "@/db/client";
import { TutorsScreen } from "@/features/tutors/tutors-screen";
import {
  getActiveCatalogOptions,
  listTutors,
} from "@/features/tutors/tutor-service";

const description = "Gestionar perfiles, carrera, materias y estado.";

export const metadata: Metadata = {
  title: "Tutores | SGTA",
  description,
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toScreenData(
  tutors: Awaited<ReturnType<typeof listTutors>>,
) {
  return {
    description,
    searchPlaceholder: "Buscar tutor",
    careerFilterLabel: "Carrera",
    statusFilterLabel: "Estado",
    rows: tutors.map((tutor) => ({
      id: tutor.id,
      name: tutor.formalName,
      career: tutor.primaryCareer.name,
      scholarship: tutor.scholarshipReference?.type ?? "Sin referencia",
      subjectCount: tutor.subjectCount,
      status:
        tutor.status === "ACTIVE" ? ("active" as const) : ("inactive" as const),
      statusLabel: tutor.status === "ACTIVE" ? "Activo" : "Inactivo",
      cycleLabel: tutor.currentCycleLabel ?? "Sin ciclo abierto",
    })),
    emptyTitle: "Todavía no hay tutores",
    emptyAction: "Agregar tutor",
  } as const;
}

export default async function AdminTutorsPage() {
  const database = getDatabase();
  const [tutors, catalogOptions] = await Promise.all([
    listTutors(database),
    getActiveCatalogOptions(database),
  ]);
  const requiredAction =
    catalogOptions.currentCycle === null
      ? "cycle"
      : catalogOptions.careers.length === 0
        ? "catalog"
        : undefined;

  return (
    <TutorsScreen
      catalogOptions={catalogOptions}
      data={toScreenData(tutors)}
      requiredAction={requiredAction}
      state={requiredAction === undefined ? "default" : "required-action"}
    />
  );
}
