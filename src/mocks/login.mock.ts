import type { ScreenStateFixture } from "./screen-state";

export const loginStateFixtures = [
  {
    state: "loading",
    title: "Conectando con Google",
    description: "Verificando el acceso. Espere un momento.",
  },
  {
    state: "error",
    title: "No se pudo iniciar sesión",
    description: "Reintentar en unos instantes para volver a intentar.",
    actionLabel: "Reintentar",
  },
  {
    state: "permission-denied",
    title: "Esta cuenta no está habilitada en SGTA",
    description: "Contactar a la administración de Tutorías para solicitar acceso.",
  },
] satisfies ScreenStateFixture[];
