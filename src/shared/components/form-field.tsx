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
  /** Places a checkbox or radio control before its label on one line. */
  inline?: boolean;
  children: ReactElement<FieldControlProps>;
}

/** Associates the single control (including composite controls) with its label and feedback. */
export function FormField({ id, label, description, error, inline = false, children }: FormFieldProps) {
  const describedBy = [children.props["aria-describedby"], description && `${id}-description`, error && `${id}-error`]
    .filter(Boolean).join(" ");
  const labelNode = <Label id={`${id}-label`} htmlFor={children.props.id ?? id}>{label}</Label>;
  const control = cloneElement(children, {
    id: children.props.id ?? id,
    "aria-describedby": describedBy ? [...new Set(describedBy.split(" "))].join(" ") : undefined,
    "aria-invalid": error ? true : children.props["aria-invalid"],
  });
  const feedback = <>
    {description && <p id={`${id}-description`} className="text-sm text-muted-foreground">{description}</p>}
    {error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
  </>;
  if (inline) {
    return (
      <div className="flex items-start gap-3" data-slot="form-field">
        <div className="pt-0.5">{control}</div>
        <div className="min-w-0 space-y-1">{labelNode}{feedback}</div>
      </div>
    );
  }
  return (
    <div className="space-y-2" data-slot="form-field">
      {labelNode}
      {control}
      {feedback}
    </div>
  );
}
