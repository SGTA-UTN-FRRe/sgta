import type { TutorsCatalogOptions, TutorsScreenData } from "./tutor-screen-types";

const cycle = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Ciclo 2026",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  status: "OPEN" as const,
};

const systemsCareer = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Ingeniería en Sistemas de Información",
  status: "ACTIVE" as const,
};

const mechanicsCareer = {
  id: "55555555-5555-4555-8555-555555555555",
  name: "Ingeniería Electromecánica",
  status: "ACTIVE" as const,
};

const chemistryCareer = {
  id: "66666666-6666-4666-8666-666666666666",
  name: "Ingeniería Química",
  status: "ACTIVE" as const,
};

function createTutor(
  input: {
    id: string;
    firstName: string;
    lastName: string;
    career: {
      id: string;
      name: string;
      status: "ACTIVE" | "INACTIVE";
    };
    status: "ACTIVE" | "INACTIVE";
    subjectCount: number;
    scholarship?: string;
    cycleLabel?: string | null;
  },
) {
  return {
    id: input.id,
    formalName: `${input.lastName}, ${input.firstName}`,
    firstName: input.firstName,
    lastName: input.lastName,
    preferredDisplayName: null,
    institutionalIdentifier: null,
    primaryCareer: input.career,
    currentCycle: input.cycleLabel === null ? null : cycle,
    currentCycleLabel: input.cycleLabel === undefined ? cycle.name : input.cycleLabel,
    scholarshipReference:
      input.scholarship === undefined
        ? null
        : {
            id: "77777777-7777-4777-8777-777777777777",
            type: input.scholarship,
            knownRequiredHours: null,
            notes: null,
            status: "ACTIVE" as const,
          },
    subjectCount: input.subjectCount,
    status: input.status,
    createdAt: "2026-09-17T00:00:00.000Z",
    updatedAt: "2026-09-17T00:00:00.000Z",
  };
}

export const tutorsScreenData = {
  description: "Gestionar perfiles, carrera, materias y estado.",
  searchPlaceholder: "Buscar tutor",
  careerFilterLabel: "Carrera",
  statusFilterLabel: "Estado",
  rows: [
    createTutor({
      id: "11111111-1111-4111-8111-111111111111",
      firstName: "Marina",
      lastName: "Benítez",
      career: systemsCareer,
      status: "ACTIVE",
      subjectCount: 4,
      scholarship: "Beca UTN",
    }),
    createTutor({
      id: "88888888-8888-4888-8888-888888888888",
      firstName: "Tomás",
      lastName: "Acosta",
      career: mechanicsCareer,
      status: "ACTIVE",
      subjectCount: 3,
      scholarship: "Beca de tutoría",
    }),
    createTutor({
      id: "99999999-9999-4999-8999-999999999999",
      firstName: "Lucía",
      lastName: "Funes",
      career: chemistryCareer,
      status: "ACTIVE",
      subjectCount: 2,
      cycleLabel: null,
    }),
    createTutor({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      firstName: "Diego",
      lastName: "Sosa",
      career: systemsCareer,
      status: "INACTIVE",
      subjectCount: 0,
      scholarship: "Beca UTN",
      cycleLabel: null,
    }),
  ],
  emptyTitle: "Todavía no hay tutores",
  emptyAction: "Agregar tutor",
} satisfies TutorsScreenData;

export const tutorsCatalogOptions = {
  careers: [systemsCareer, mechanicsCareer, chemistryCareer],
  subjects: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      name: "Álgebra",
      careerId: systemsCareer.id,
      careerName: systemsCareer.name,
      status: "ACTIVE" as const,
    },
  ],
  scholarshipReferences: [
    {
      id: "77777777-7777-4777-8777-777777777777",
      type: "Beca UTN",
      knownRequiredHours: null,
      notes: null,
      status: "ACTIVE" as const,
    },
  ],
  currentCycle: cycle,
} satisfies TutorsCatalogOptions;

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
    description:
      "Es necesario contar con un ciclo abierto para incorporar tutores al período actual.",
    actionLabel: "Configurar ciclo",
  },
] as const;
