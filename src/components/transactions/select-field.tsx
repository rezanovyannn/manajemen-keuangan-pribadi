import { Label } from "@/components/ui/label";

export type SelectOption = { value: string; label: string };

type SelectFieldProps = {
  name: string;
  label: string;
  options: SelectOption[];
  placeholder: string;
  defaultValue?: string;
  errors?: string[];
};

// <select> bawaan browser: paling cepat dan nyaman di HP (picker native).
export function SelectField({ name, label, options, placeholder, defaultValue, errors }: SelectFieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const error = errors?.[0];
  const valid = options.some((o) => o.value === defaultValue);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        defaultValue={valid ? defaultValue : ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-10 w-full min-w-0 rounded-md border border-input bg-card px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
