import type { Metadata } from "next";

import { getDatabase } from "@/db/client";
import {
  HOUR_ERROR_CODES,
  getHourWorkspace,
  HourServiceError,
  listHourMovements,
} from "@/features/hours/hour-service";
import { HoursScreen } from "@/features/hours/hours-screen";
import type {
  HoursScreenData,
  HoursStateDetail,
} from "@/features/hours/hours-screen-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pageDescription = "Consultar saldos y registrar movimientos trazables.";

export const metadata: Metadata = {
  title: "Horas | SGTA",
  description: pageDescription,
};

const emptyData: HoursScreenData = {
  description: pageDescription,
  searchPlaceholder: "Buscar tutor",
  statusFilterLabel: "Estado",
  categoryFilterLabel: "Categoría",
  currentCycle: null,
  balances: [],
  eligibleTutors: [],
  categories: [],
  history: [],
};

const cycleRequiredState: HoursStateDetail = {
  actionHref: "/admin/settings",
  actionLabel: "Configurar ciclo",
  description:
    "Abrir un ciclo administrativo para consultar saldos y registrar movimientos.",
  title: "Abrir un ciclo para consultar horas",
};

const categoriesRequiredState: HoursStateDetail = {
  actionHref: "/admin/settings",
  actionLabel: "Configurar categorías",
  description:
    "Crear o activar una categoría de horas antes de registrar movimientos.",
  title: "Configurar categorías de horas",
};

const tutorsRequiredState: HoursStateDetail = {
  actionHref: "/admin/tutors",
  actionLabel: "Revisar tutores",
  description:
    "Se necesita al menos un tutor activo con pertenencia al ciclo vigente.",
  title: "No hay tutores elegibles",
};

function errorMessageFor(error: unknown) {
  if (
    error instanceof HourServiceError &&
    error.code === HOUR_ERROR_CODES.openCycleRequired
  ) {
    return undefined;
  }

  return "No se pudieron cargar las horas. Reintentar para volver a consultar los saldos.";
}

export default async function AdminHoursPage() {
  let data = emptyData;
  let state: "default" | "error" | "required-action" = "default";
  let stateDetail: HoursStateDetail | undefined;
  let initialErrorMessage: string | undefined;

  try {
    const database = getDatabase();
    const workspace = await getHourWorkspace(database);
    const history = await listHourMovements(database, {
      cycleId: workspace.currentCycle.id,
      limit: 200,
    });

    data = {
      ...emptyData,
      currentCycle: workspace.currentCycle,
      balances: workspace.balances,
      eligibleTutors: workspace.eligibleTutors,
      categories: workspace.categories,
      history,
    };

    if (workspace.categories.length === 0) {
      state = "required-action";
      stateDetail = categoriesRequiredState;
    } else if (workspace.eligibleTutors.length === 0) {
      state = "required-action";
      stateDetail = tutorsRequiredState;
    }
  } catch (error) {
    if (
      error instanceof HourServiceError &&
      error.code === HOUR_ERROR_CODES.openCycleRequired
    ) {
      state = "required-action";
      stateDetail = cycleRequiredState;
    } else {
      state = "error";
      initialErrorMessage = errorMessageFor(error);
    }
  }

  return (
    <HoursScreen
      data={data}
      initialErrorMessage={initialErrorMessage}
      state={state}
      stateDetail={stateDetail}
    />
  );
}
