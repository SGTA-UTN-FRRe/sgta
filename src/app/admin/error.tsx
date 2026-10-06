"use client";

import { RouteErrorState } from "@/shared/components/route-error-state";

export default function AdminError({ retry }: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <RouteErrorState retry={retry} homeHref="/admin" />;
}
