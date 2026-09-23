"use client";

import { createAuthClient } from "better-auth/react";
import {
  ArrowRight,
  CircleAlert,
  LockKeyhole,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import type { LoginScreenData } from "@/mocks/login.mock";
import { Button } from "@/components/ui/button";
import { FaroIcon } from "@/shared/components/faro-icon";

import {
  loginStateFromAuthError,
  type LoginAuthState,
} from "./login-auth";

const authClient = createAuthClient();

export type LoginPreviewState = LoginAuthState;

export interface LoginScreenProps {
  data: LoginScreenData;
  state?: LoginPreviewState;
  /** Optional callback override used by isolated component tests and previews. */
  onContinue?: () => void;
  onRetry?: () => void;
}

function FaroBeam() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <span className="absolute -right-32 top-[22%] h-px w-[34rem] rotate-[18deg] bg-accent/35" />
      <span className="absolute -right-28 top-[48%] h-px w-[28rem] rotate-[-13deg] bg-accent/25" />
      <span className="absolute right-[14%] top-[11%] h-[24rem] w-px rotate-[22deg] bg-accent/20" />
      <span className="absolute right-[37%] top-[36%] h-56 w-px rotate-[-19deg] bg-white/10" />
      <span className="absolute -right-24 top-[33%] h-40 w-40 rounded-full border border-accent/20" />
    </div>
  );
}

function LoginFeedback({
  data,
  state,
}: Pick<LoginScreenProps, "data" | "state">) {
  if (state === "loading") {
    return (
      <div
        className="flex min-h-16 items-start gap-3"
        id="login-status"
        role="status"
      >
        <LoaderCircle
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary"
        />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {data.states.loadingLabel}
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground-secondary">
            Verificando el acceso. Espere un momento.
          </p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div
        aria-live="assertive"
        className="flex min-h-16 items-start gap-3"
        id="login-status"
        role="alert"
      >
        <CircleAlert
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-danger"
        />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {data.states.errorTitle}
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground-secondary">
            {data.states.errorDescription}
          </p>
        </div>
      </div>
    );
  }

  if (state === "permission-denied") {
    return (
      <div
        aria-live="polite"
        className="flex min-h-16 items-start gap-3"
        id="login-status"
        role="status"
      >
        <LockKeyhole
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-warning"
        />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {data.states.permissionDeniedTitle}
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground-secondary">
            {data.states.permissionDeniedDescription}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-16 items-start gap-3" id="login-status">
      <ShieldCheck
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0 text-primary"
      />
      <div>
        <p className="text-sm font-semibold text-foreground">
          Acceso restringido
        </p>
        <p className="mt-1 text-sm leading-6 text-foreground-secondary">
          Solo pueden ingresar las personas habilitadas por la administración.
        </p>
      </div>
    </div>
  );
}

export function LoginScreen({
  data,
  state = "default",
  onContinue,
  onRetry,
}: LoginScreenProps) {
  const [interactionState, setInteractionState] =
    useState<LoginPreviewState | null>(null);
  const currentState = interactionState ?? state;

  const isLoading = currentState === "loading";
  const isError = currentState === "error";
  const buttonLabel = isError ? "Reintentar" : data.ctaLabel;

  const startGoogleSignIn = () => {
    setInteractionState("loading");

    void authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/login",
    }).then((result) => {
      const response = result as unknown as { error?: unknown };

      if (response.error !== undefined) {
        setInteractionState(loginStateFromAuthError(response.error));
      }
    }).catch((error: unknown) => {
      setInteractionState(loginStateFromAuthError(error));
    });
  };

  const handleContinue = isError
    ? onRetry ?? startGoogleSignIn
    : onContinue ?? startGoogleSignIn;

  return (
    <main
      aria-labelledby="login-title"
      className="min-h-svh overflow-x-hidden bg-canvas"
      data-slot="login-screen"
      data-state={currentState}
    >
      <div className="grid min-h-svh md:grid-cols-[minmax(18rem,0.82fr)_minmax(28rem,1.18fr)]">
        <section
          aria-label="Identidad institucional"
          className="relative isolate flex min-h-[18rem] overflow-hidden bg-brand-navy px-6 py-8 text-white sm:px-10 sm:py-10 md:min-h-full md:px-8 md:py-10 lg:px-12 lg:py-12"
        >
          <FaroBeam />
          <div className="relative z-10 flex w-full flex-col justify-between gap-12">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md border border-white/20 bg-white/10 text-accent">
                <FaroIcon aria-hidden="true" className="h-7 w-7" />
              </span>
              <div>
                <p className="text-sm font-bold tracking-[0.12em] text-white">
                  SGTA
                </p>
                <p className="text-xs text-white/70">
                  {data.institutionalContext}
                </p>
              </div>
            </div>

            <div className="max-w-lg lg:pb-10">
              <p className="text-sm font-bold tracking-[0.08em] text-accent">
                {data.institutionalContext}
              </p>
              <h2 className="mt-4 max-w-md text-3xl font-extrabold tracking-[-0.035em] text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]">
                Un espacio claro para acompañar cada trayectoria.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-white/75 sm:text-base">
                Organizar tutorías, horarios y horas con una mirada compartida
                sobre el acompañamiento institucional.
              </p>
            </div>

            <p className="text-xs font-medium tracking-[0.08em] text-white/60">
              Espacio institucional de trabajo
            </p>
          </div>
        </section>

        <section
          aria-label="Acceso institucional"
          className="flex min-w-0 items-center justify-center bg-canvas px-6 py-12 sm:px-10 sm:py-16 lg:px-16"
        >
          <div className="w-full max-w-[30rem]">
            <div className="mb-8">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Acceso institucional
              </p>
              <h1
                className="text-3xl font-extrabold tracking-[-0.035em] text-foreground sm:text-4xl"
                id="login-title"
              >
                {data.title}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-foreground-secondary">
                {data.supportingText}
              </p>
            </div>

            <div
              aria-busy={isLoading}
              aria-describedby="login-status login-recovery login-access-note"
              className="rounded-[var(--radius-xl)] border border-border-subtle bg-surface p-6 shadow-sm sm:p-8"
            >
              <LoginFeedback data={data} state={currentState} />

              <Button
                aria-disabled={isLoading}
                className="mt-7 w-full aria-disabled:pointer-events-none aria-disabled:opacity-50"
                onClick={isLoading ? undefined : handleContinue}
                size="lg"
                type="button"
              >
                {isLoading ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : isError ? (
                  <CircleAlert aria-hidden="true" />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
                {buttonLabel}
              </Button>

              <p
                className="mt-5 text-center text-sm leading-6 text-foreground-secondary"
                id="login-recovery"
              >
                {data.recoveryText}
              </p>
            </div>

            <div
              className="mt-6 flex items-start gap-2 text-xs leading-5 text-foreground-muted"
              id="login-access-note"
            >
              <LockKeyhole aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                El acceso es exclusivamente institucional. No hay registro
                público.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
