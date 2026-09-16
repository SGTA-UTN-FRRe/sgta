import type { ScreenStateFixture } from "./screen-state";

export type TutorStatus = "active" | "inactive";

export interface TutorRow {
  id: string;
  name: string;
  career: string;
  scholarship: string;
  subjectCount: number;
  status: TutorStatus;
  statusLabel: string;
  cycleLabel: string;
}

export interface TutorsScreenData {
  description: string;
  searchPlaceholder: string;
  careerFilterLabel: string;
  statusFilterLabel: string;
  rows: TutorRow[];
  emptyTitle: string;
  emptyAction: string;
}

export const tutorsScreenData = {
  description: "Gestionar perfiles, carrera, materias y estado.",
  searchPlaceholder: "Buscar tutor",
  careerFilterLabel: "Carrera",
  statusFilterLabel: "Estado",
  rows: [
    {
      id: "tutor-marina-benitez",
      name: "Benítez, Marina",
      career: "Ingeniería en Sistemas de Información",
      scholarship: "Beca UTN",
      subjectCount: 4,
      status: "active",
      statusLabel: "Activo",
      cycleLabel: "2.º cuatrimestre 2026",
    },
    {
      id: "tutor-tomas-acosta",
      name: "Acosta, Tomás",
      career: "Ingeniería Electromecánica",
      scholarship: "Beca de tutoría",
      subjectCount: 3,
      status: "active",
      statusLabel: "Activo",
      cycleLabel: "2.º cuatrimestre 2026",
    },
    {
      id: "tutor-lucia-funes",
      name: "Funes, Lucía",
      career: "Ingeniería Química",
      scholarship: "Sin referencia",
      subjectCount: 2,
      status: "active",
      statusLabel: "Activo",
      cycleLabel: "2.º cuatrimestre 2026",
    },
    {
      id: "tutor-diego-sosa",
      name: "Sosa, Diego",
      career: "Ingeniería en Sistemas de Información",
      scholarship: "Beca UTN",
      subjectCount: 0,
      status: "inactive",
      statusLabel: "Inactivo",
      cycleLabel: "Ciclo anterior",
    },
  ],
  emptyTitle: "Todavía no hay tutores",
  emptyAction: "Agregar tutor",
} satisfies TutorsScreenData;

export const tutorsStateFixtures = [
  {
    state: "loading",
    title: "Cargando tutores",
    description: "Estamos preparando la lista de tutores.",
  },
  {
    state: "empty",
    title: "Todavía no hay tutores",
    description: "Agregar el primer tutor para comenzar a organizar la cobertura.",
    actionLabel: "Agregar tutor",
  },
  {
    state: "search-empty",
    title: "No encontramos tutores",
    description: "Probar con otro nombre o limpiar los filtros.",
    actionLabel: "Limpiar filtros",
  },
  {
    state: "error",
    title: "No se pudo cargar la lista",
    description: "Reintentar para volver a consultar los tutores.",
    actionLabel: "Reintentar",
  },
  {
    state: "required-action",
    title: "Abrir un ciclo para gestionar tutores",
    description: "Es necesario contar con un ciclo abierto para incorporar tutores al período actual.",
    actionLabel: "Configurar ciclo",
  },
] satisfies ScreenStateFixture[];
