import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
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
      <div className="relative w-full">
        <select
          id={id}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint)}
          className={cn(
            controlClass(error, "h-10 cursor-pointer appearance-none pl-3.5 pr-10 font-normal shadow-sm"),
            "transition-all duration-150 hover:border-primary/50"
          )}
          {...selectProps}
        >
          {options.map(option => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="bg-card text-foreground py-2 font-normal"
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground/70">
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </FieldShell>
  );
}
