import type { Metadata } from "next";

import { getDatabase } from "@/db/client";
import {
  listAdministrativeCycles,
  type SafeAdministrativeCycle,
} from "@/features/cycles/cycle-service";
import {
  HOUR_ERROR_CODES,
  HourServiceError,
  listHourMovements,
  type SafeHourMovement,
} from "@/features/hours/hour-service";
import {
  MovementHistoryScreen,
  type MovementHistoryScreenState,
} from "@/features/hours/movement-history-screen";
import type { HoursStateDetail } from "@/features/hours/hours-screen-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pageDescription =
  "Consultar movimientos persistidos y corregirlos mediante reversiones trazables.";

export const metadata: Metadata = {
  title: "Movimientos | SGTA",
  description: pageDescription,
};

const noCycleState: HoursStateDetail = {
  actionHref: "/admin/settings",
  actionLabel: "Configurar ciclo",
  description:
    "Crear un ciclo administrativo para consultar y corregir movimientos de horas.",
  title: "Configurar un ciclo para consultar movimientos",
};

const errorState: HoursStateDetail = {
  actionHref: "/admin/hours/movements",
  actionLabel: "Reintentar",
  description:
    "Reintentar para volver a consultar el historial persistido del ciclo.",
  title: "No se pudo cargar el historial",
};

type HistorySearchParams = Promise<{
  categoryId?: string | string[];
  cycleId?: string | string[];
  tutorId?: string | string[];
}>;

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function selectCycle(
  cycles: SafeAdministrativeCycle[],
  requestedCycleId: string | undefined,
) {
  return (
    cycles.find((cycle) => cycle.id === requestedCycleId) ??
    cycles.find((cycle) => cycle.status === "OPEN") ??
    cycles[0] ??
    null
  );
}

export default async function AdminHourMovementsPage({
  searchParams,
}: {
  searchParams: HistorySearchParams;
}) {
  let cycles: SafeAdministrativeCycle[] = [];
  let movements: SafeHourMovement[] = [];
  let selectedCycleId: string | null = null;
  let state: MovementHistoryScreenState = "default";
  let stateDetail: HoursStateDetail | undefined;
  let initialErrorMessage: string | undefined;

  const params = await searchParams;
  const requestedCycleId = firstSearchParam(params.cycleId);
  const initialTutorId = firstSearchParam(params.tutorId);
  const initialCategoryId = firstSearchParam(params.categoryId);

  try {
    const database = getDatabase();
    cycles = await listAdministrativeCycles(database);
    const selectedCycle = selectCycle(cycles, requestedCycleId);

    if (selectedCycle === null) {
      state = "required-action";
      stateDetail = noCycleState;
    } else {
      selectedCycleId = selectedCycle.id;
      movements = await listHourMovements(database, {
        cycleId: selectedCycle.id,
        limit: 200,
      });
    }
  } catch (error) {
    if (
      error instanceof HourServiceError &&
      error.code === HOUR_ERROR_CODES.cycleNotFound
    ) {
      state = "required-action";
      stateDetail = noCycleState;
    } else {
      state = "error";
      stateDetail = errorState;
      initialErrorMessage =
        "No se pudo cargar el historial. Reintentar para volver a consultar los movimientos.";
    }
  }

  return (
    <MovementHistoryScreen
      cycles={cycles}
      dataDescription={pageDescription}
      initialCategoryId={initialCategoryId}
      initialCycleId={selectedCycleId}
      initialErrorMessage={initialErrorMessage}
      initialMovements={movements}
      initialState={state}
      initialStateDetail={stateDetail}
      initialTutorId={initialTutorId}
    />
  );
}
