import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { FieldShell, controlClass, describedBy } from "./FieldShell";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
}

export function TextField({ label, hint, error, className, id: idProp, required, ...inputProps }: TextFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <input id={id} required={required} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} className={controlClass(error, "h-10")} {...inputProps} />
    </FieldShell>
  );
}
