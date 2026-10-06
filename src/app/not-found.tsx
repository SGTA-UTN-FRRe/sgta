import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { FaroIcon } from "@/shared/components/faro-icon";
import { cn } from "@/shared/utils";

export const metadata: Metadata = {
  title: "Página no encontrada | SGTA",
  description: "La página solicitada no está disponible.",
};

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-canvas px-4 py-12">
      <section
        aria-labelledby="not-found-title"
        className="w-full max-w-lg rounded-lg border border-border bg-surface px-6 py-10 text-center shadow-sm sm:px-10"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-accent/40 bg-accent-surface text-accent">
          <FaroIcon className="h-10 w-10" />
        </div>
        <h1
          id="not-found-title"
          className="mt-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          No encontramos esa página
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-foreground-secondary">
          Verificar la dirección o volver al inicio.
        </p>
        <div className="mt-7">
          <Link href="/" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
