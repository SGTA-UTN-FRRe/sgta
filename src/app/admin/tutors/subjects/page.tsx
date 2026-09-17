import type { Metadata } from "next";

import { getDatabase } from "@/db/client";
import { SubjectCoverageScreen } from "@/features/tutors/subject-coverage-screen";
import type { SafeSubjectCoverageResult } from "@/features/tutors/tutor-service";
import { listSubjectCoverage } from "@/features/tutors/tutor-service";

export const metadata: Metadata = {
  title: "Materias | SGTA",
  description: "Consultar la cobertura derivada del catálogo académico.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emptyCoverage: SafeSubjectCoverageResult = {
  currentCycle: null,
  subjects: [],
};

export default async function AdminTutorSubjectsPage() {
  let coverage = emptyCoverage;
  let loadError: string | undefined;

  try {
    coverage = await listSubjectCoverage(getDatabase());
  } catch {
    loadError =
      "No se pudo cargar la cobertura. Reintentar para volver a consultar las materias.";
  }

  return (
    <SubjectCoverageScreen
      data={coverage}
      errorMessage={loadError}
      state={loadError === undefined ? undefined : "error"}
    />
  );
}
