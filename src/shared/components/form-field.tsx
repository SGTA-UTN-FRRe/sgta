import type { ReactNode } from "react";

export function FormField({ id, label, description, children }: {
  id: string;
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div id={`${id}-label`} className="text-sm font-semibold text-foreground">{label}</div>
      {children}
      {description && <p id={`${id}-description`} className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
