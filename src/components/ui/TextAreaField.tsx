import { useId, type ReactNode, type TextareaHTMLAttributes } from "react";
import { FieldShell, controlClass, describedBy } from "./FieldShell";

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
}

export function TextAreaField({ label, hint, error, className, id: idProp, rows = 3, required, ...inputProps }: TextAreaFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, hint)}
        className={controlClass(error, "resize-y py-2")}
        {...inputProps}
      />
    </FieldShell>
  );
}
