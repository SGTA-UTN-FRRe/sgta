import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FaroIcon } from "@/shared/components/faro-icon";
import { cn } from "@/shared/utils";

export const metadata: Metadata = {
  title: "Acceso restringido | SGTA",
  description: "La cuenta actual no tiene permisos para esta sección.",
};

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-canvas px-4 py-12">
      <section
        aria-labelledby="forbidden-title"
        className="w-full max-w-lg rounded-lg border border-border bg-surface px-6 py-10 text-center shadow-sm sm:px-10"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-accent/40 bg-accent-surface text-accent">
          <FaroIcon className="h-10 w-10" />
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-danger">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          <span>Acceso restringido</span>
        </div>
        <h1
          id="forbidden-title"
          className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          No tienes permisos para esta sección
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-foreground-secondary">
          Tu cuenta está habilitada en SGTA, pero necesita otro nivel de acceso
          para continuar aquí.
        </p>
        <div className="mt-7">
          <Link
            href="/"
            className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
