import type { Metadata } from "next";

import { requireRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import { parseConsultationListQuery } from "@/features/consultations/consultation-api";
import { getConsultationWorkspace } from "@/features/consultations/consultation-service";
import type {
  ConsultationFilters,
  ConsultationWorkspace,
} from "@/features/consultations/consultation-validation";
import { ConsultationsScreen } from "@/features/consultations/consultations-screen";
import { listCareers, listTutors } from "@/features/tutors/tutor-service";

export const metadata: Metadata = {
  title: "Consultas | SGTA",
  description: "Importar, revisar y consultar registros de atención académica.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminConsultationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const defaultFilters: ConsultationFilters = {
  status: "ALL",
  limit: 50,
  offset: 0,
};

function toSearchParams(
  values: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) {
        params.append(key, item);
      }
    }
  }

  return params;
}

function filtersFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const parsed = parseConsultationListQuery(
    new Request(
      `https://sgta.invalid/api/admin/consultations?${toSearchParams(searchParams)}`,
    ),
  );

  return parsed.success
    ? { filters: parsed.data, invalid: false }
    : { filters: defaultFilters, invalid: true };
}

function tutorFilterOptions(tutors: Awaited<ReturnType<typeof listTutors>>) {
  return tutors.map((tutor) => ({
    id: tutor.id,
    name: tutor.formalName,
    status: tutor.status,
  }));
}

export default async function AdminConsultationsPage({
  searchParams,
}: AdminConsultationsPageProps) {
  await requireRole("ADMIN");

  const query = (await searchParams) ?? {};
  const { filters, invalid } = filtersFromSearchParams(query);
  let workspace: ConsultationWorkspace | null = null;
  let careers: Awaited<ReturnType<typeof listCareers>> = [];
  let tutors: Awaited<ReturnType<typeof listTutors>> = [];
  let initialLoadError: string | undefined;

  try {
    const database = getDatabase();
    const [pageWorkspace, queueWorkspace, careerOptions, tutorOptions] =
      await Promise.all([
        getConsultationWorkspace(database, filters),
        filters.offset === 0
          ? Promise.resolve(null)
          : getConsultationWorkspace(database, { ...filters, offset: 0 }),
        listCareers(database, "ALL"),
        listTutors(database, { status: "ALL", limit: 200, offset: 0 }),
      ]);

    workspace = queueWorkspace === null
      ? pageWorkspace
      : {
          ...pageWorkspace,
          reviewQueue: queueWorkspace.reviewQueue,
        };
    careers = careerOptions;
    tutors = tutorOptions;
  } catch {
    initialLoadError = "No se pudo cargar la lista de consultas. Reintentar.";
  }

  return (
    <ConsultationsScreen
      careers={careers}
      initialFilterError={invalid}
      initialFilters={filters}
      initialLoadError={initialLoadError}
      initialWorkspace={workspace}
      tutors={tutorFilterOptions(tutors)}
    />
  );
}
