import type { ScreenStateFixture } from "./screen-state";

export interface LoginScreenData {
  productName: string;
  institutionalContext: string;
  title: string;
  supportingText: string;
  ctaLabel: string;
  recoveryText: string;
  states: {
    loadingLabel: string;
    errorTitle: string;
    errorDescription: string;
    permissionDeniedTitle: string;
    permissionDeniedDescription: string;
  };
}

export const loginScreenData = {
  productName: "Sistema de Gestión de Tutorías",
  institutionalContext: "Tutorías UTN FRRe",
  title: "Sistema de Gestión de Tutorías",
  supportingText: "Acceso para usuarios habilitados de Tutorías UTN FRRe.",
  ctaLabel: "Continuar con Google",
  recoveryText: "Contactar a la administración de Tutorías para solicitar acceso.",
  states: {
    loadingLabel: "Conectando…",
    errorTitle: "No pudimos iniciar sesión",
    errorDescription: "Reintentar en unos instantes. Si el problema continúa, contactar a la administración.",
    permissionDeniedTitle: "Esta cuenta no está habilitada en SGTA",
    permissionDeniedDescription: "Contactar a la administración de Tutorías para solicitar acceso.",
  },
} satisfies LoginScreenData;

export const loginStateFixtures = [
  {
    state: "loading",
    title: "Conectando con Google",
    description: "Verificando el acceso. Espere un momento.",
  },
  {
    state: "error",
    title: "No pudimos iniciar sesión",
    description: "Reintentar en unos instantes para volver a intentar.",
    actionLabel: "Reintentar",
  },
  {
    state: "permission-denied",
    title: "Esta cuenta no está habilitada en SGTA",
    description: "Contactar a la administración de Tutorías para solicitar acceso.",
  },
] satisfies ScreenStateFixture[];
