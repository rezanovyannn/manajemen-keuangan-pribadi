"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Kelompokkan digit dengan titik saat mengetik: "1250000" -> "1.250.000".
export function formatDigits(raw: string) {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

type MoneyInputProps = {
  name: string;
  label: string;
  defaultValue?: string;
  errors?: string[];
};

// Input nominal Rupiah: keyboard angka di HP, format ribuan otomatis.
// Nilai yang dikirim tetap teks; server mem-parse dengan parseRupiah.
export function MoneyInput({ name, label, defaultValue = "", errors }: MoneyInputProps) {
  const [value, setValue] = useState(() => formatDigits(defaultValue));
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const error = errors?.[0];

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
        >
          Rp
        </span>
        <Input
          id={id}
          name={name}
          inputMode="numeric"
          autoComplete="off"
          className="h-10 pl-9 tabular-nums"
          value={value}
          onChange={(e) => setValue(formatDigits(e.target.value))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
