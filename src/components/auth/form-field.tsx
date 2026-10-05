import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormFieldProps = React.ComponentProps<"input"> & {
  name: string;
  label: string;
  errors?: string[];
};

export function FormField({ name, label, errors, ...inputProps }: FormFieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const error = errors?.[0];

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        className="h-10"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ message, tone }: { message?: string; tone: "error" | "success" }) {
  if (!message) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          : "rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
      }
    >
      {message}
    </p>
  );
}
