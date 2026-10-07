"use client";

import { useActionState } from "react";

import { daftar, type AuthFormState } from "@/actions/auth";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";

export function DaftarForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(daftar, {});

  if (state.success) {
    return <FormAlert message={state.success} tone="success" />;
  }

  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormAlert message={state.error} tone="error" />
      <FormField
        name="displayName"
        label="Nama"
        autoComplete="name"
        required
        maxLength={100}
        defaultValue={state.values?.displayName}
        errors={state.fieldErrors?.displayName}
      />
      <FormField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        errors={state.fieldErrors?.password}
      />
      <p className="-mt-2 text-xs text-muted-foreground">Minimal 8 karakter.</p>
      <Button type="submit" size="lg" className="h-11 md:h-10 w-full" disabled={pending}>
        {pending ? "Memproses..." : "Daftar"}
      </Button>
    </form>
  );
}
