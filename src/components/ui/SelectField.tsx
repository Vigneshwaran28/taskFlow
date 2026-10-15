import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { FieldShell, controlClass, describedBy } from "./FieldShell";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  options: readonly SelectOption[];
}

export function SelectField({ label, hint, error, className, id: idProp, options, required, ...selectProps }: SelectFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <select id={id} required={required} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} className={controlClass(error, "h-10 pr-8")} {...selectProps}>
        {options.map(option => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
