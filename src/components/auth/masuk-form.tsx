"use client";

import { useActionState } from "react";

import { masuk, type AuthFormState } from "@/actions/auth";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";

export function MasukForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(masuk, {});

  return (
    <form action={action} className="grid gap-4" noValidate>
      {/* notice dari URL hanya tampil sebelum form pertama kali dikirim */}
      <FormAlert message={state.error ?? (state.values ? undefined : notice)} tone="error" />
      <input type="hidden" name="next" value={next ?? ""} />
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
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.password}
      />
      <Button type="submit" size="lg" className="h-10 w-full" disabled={pending}>
        {pending ? "Memproses..." : "Masuk"}
      </Button>
    </form>
  );
}
