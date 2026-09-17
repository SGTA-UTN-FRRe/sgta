import type { Metadata } from "next";

import { getDatabase } from "@/db/client";
import { SubjectCoverageScreen } from "@/features/tutors/subject-coverage-screen";
import { listSubjectCoverage } from "@/features/tutors/tutor-service";

export const metadata: Metadata = {
  title: "Materias | SGTA",
  description: "Consultar la cobertura derivada del catálogo académico.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminTutorSubjectsPage() {
  const coverage = await listSubjectCoverage(getDatabase());

  return <SubjectCoverageScreen data={coverage} />;
}
