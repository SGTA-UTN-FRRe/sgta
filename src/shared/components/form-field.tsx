import { cloneElement, type ReactElement, type ReactNode } from "react";
import { Label } from "@/components/ui/label";

interface FieldControlProps {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

export interface FormFieldProps {
  id: string;
  label: string;
  description?: ReactNode;
  error?: ReactNode;
  children: ReactElement<FieldControlProps>;
}

/** Associates the single control (including composite controls) with its label and feedback. */
export function FormField({ id, label, description, error, children }: FormFieldProps) {
  const describedBy = [children.props["aria-describedby"], description && `${id}-description`, error && `${id}-error`]
    .filter(Boolean).join(" ");
  return (
    <div className="space-y-2" data-slot="form-field">
      <Label id={`${id}-label`} htmlFor={children.props.id ?? id}>{label}</Label>
      {cloneElement(children, {
        id: children.props.id ?? id,
        "aria-describedby": describedBy ? [...new Set(describedBy.split(" "))].join(" ") : undefined,
        "aria-invalid": error ? true : children.props["aria-invalid"],
      })}
      {description && <p id={`${id}-description`} className="text-sm text-muted-foreground">{description}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
