"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { SystemState } from "./system-state";

interface RouteErrorStateProps {
  retry: () => void;
  homeHref: "/admin" | "/tutor";
}

export function RouteErrorState({ retry, homeHref }: RouteErrorStateProps) {
  return (
    <div className="space-y-6 pb-8">
      <SystemState
        variant="error"
        data-slot="page-header"
        headingLevel={1}
        title="No se pudo cargar esta sección"
        description="Intentar nuevamente. Si el problema continúa, avisar a la administración."
        action={
          <>
            <Button size="lg" onClick={retry}>Reintentar</Button>
            <Link href={homeHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
              Volver al inicio
            </Link>
          </>
        }
      />
    </div>
  );
}
