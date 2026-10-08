import type { AdminOverviewStateCopy } from "./admin-overview-types";

export const adminOverviewStateCopy = [
  {
    state: "loading",
    title: "Cargando el inicio",
    description: "Estamos preparando el ciclo y las tareas pendientes.",
  },
  {
    state: "empty",
    title: "No hay acciones pendientes.",
    description: "La operación del ciclo está al día.",
  },
  {
    state: "error",
    title: "No se pudo cargar la atención",
    description: "Reintentar para volver a consultar la información operativa.",
    actionLabel: "Reintentar",
  },
  {
    state: "degraded",
    title: "Importación de consultas con incidencias",
    description:
      "La última importación no se completó por completo. La cola local y el resto de la operación siguen disponibles.",
    actionLabel: "Revisar consultas",
  },
  {
    state: "required-action",
    title: "Abrir un ciclo para comenzar a operar.",
    description: "Es necesario contar con un ciclo abierto para ver la atención y las guardias.",
    actionLabel: "Configurar ciclo",
  },
] satisfies AdminOverviewStateCopy[];
