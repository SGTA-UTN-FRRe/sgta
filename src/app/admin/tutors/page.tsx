import type { Metadata } from "next";

import { getDatabase } from "@/db/client";
import { TutorsScreen } from "@/features/tutors/tutors-screen";
import type { TutorsScreenData } from "@/features/tutors/tutor-screen-types";
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
): TutorsScreenData {
  return {
    description,
    searchPlaceholder: "Buscar tutor",
    careerFilterLabel: "Carrera",
    statusFilterLabel: "Estado",
    rows: tutors,
    emptyTitle: "Todav\u00eda no hay tutores",
    emptyAction: "Agregar tutor",
  };
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
