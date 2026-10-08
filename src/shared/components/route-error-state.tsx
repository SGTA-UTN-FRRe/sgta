"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/shared/components/page-header";

interface RouteErrorStateProps {
  retry: () => void;
  homeHref: "/admin" | "/tutor";
}

export function RouteErrorState({ retry, homeHref }: RouteErrorStateProps) {
  return (
    <div className="space-y-6 pb-8">
      <div role="alert" className="space-y-4">
        <CircleAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
        <PageHeader
          title="No se pudo cargar esta sección"
          description="Intentar nuevamente. Si el problema continúa, avisar a la administración."
        />
      </div>
      <div className="flex flex-col items-start gap-3 sm:flex-row">
        <Button size="lg" onClick={retry}>Reintentar</Button>
        <Link href={homeHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
