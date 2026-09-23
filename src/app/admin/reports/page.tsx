import type { Metadata } from "next";

import { getDatabase } from "@/db/client";
import {
  getOperationalReport,
  getReportFilterOptions,
} from "@/features/reports/report-service";
import { ReportFilterValidationError } from "@/features/reports/report-validation";
import type { OperationalReport } from "@/features/reports/report-types";
import { ReportsScreen } from "@/features/reports/reports-screen";
import type { ReportFilterOptions } from "@/features/reports/report-service";

export const metadata: Metadata = {
  title: "Reportes | SGTA",
  description: "Consultar demanda, cobertura, asistencia y horas operativas.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function omitEmptyFilterValues(
  query: Record<string, string | string[] | undefined>,
) {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== ""),
  );
}

function filterErrorMessages(error: ReportFilterValidationError) {
  const labels: Record<string, string> = {
    fromDate: "La fecha inicial",
    toDate: "La fecha final",
    careerId: "La carrera",
    subjectId: "La materia",
    tutorId: "El tutor",
    modality: "La modalidad",
  };

  return [...new Set(error.issues.map((issue) =>
    {
      if (issue.code === "unrecognized_keys") {
        return "El enlace contiene un parámetro de filtro no admitido.";
      }
      if (issue.code === "invalid_type" || issue.code === "invalid_format") {
        const field = typeof issue.path[0] === "string" ? labels[issue.path[0]] : undefined;
        return field === undefined
          ? "Uno de los filtros no tiene un formato válido."
          : `${field} no tiene un formato válido.`;
      }
      return issue.message;
    },
  ))];
}

export default async function AdminReportsPage({
  searchParams,
}: ReportsPageProps) {
  const query = (await searchParams) ?? {};
  let report: OperationalReport | null = null;
  let filterErrors: string[] = [];
  let loadError = false;
  let filterOptions: ReportFilterOptions | null = null;
  let filterOptionsError = false;

  try {
    const database = getDatabase();
    const [reportResult, optionsResult] = await Promise.allSettled([
      getOperationalReport(database, omitEmptyFilterValues(query)),
      getReportFilterOptions(database),
    ]);

    if (reportResult.status === "fulfilled") {
      report = reportResult.value;
    } else if (reportResult.reason instanceof ReportFilterValidationError) {
      filterErrors = filterErrorMessages(reportResult.reason);
    } else {
      loadError = true;
    }

    if (optionsResult.status === "fulfilled") {
      filterOptions = optionsResult.value;
    } else {
      filterOptionsError = true;
    }
  } catch {
    loadError = true;
    filterOptionsError = true;
  }

  return (
    <ReportsScreen
      filterErrors={filterErrors}
      filterOptions={filterOptions}
      filterOptionsError={filterOptionsError}
      loadError={loadError}
      query={query}
      report={report}
    />
  );
}
