"use client";

import { useActionState } from "react";

import { saveName } from "@/actions/onboarding";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";

export function NameStep({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(saveName, {});
  return (
    <form action={action} className="grid gap-5" noValidate key={JSON.stringify(state.values)}>
      <FormAlert tone="error" message={state.error} />
      <FormField
        name="displayName"
        label="Nama panggilan"
        placeholder="Contoh: Reza"
        maxLength={50}
        autoComplete="given-name"
        autoFocus
        defaultValue={state.values?.displayName ?? defaultName}
        errors={state.fieldErrors?.displayName}
      />
      <Button type="submit" size="lg" className="h-12 text-base" disabled={pending}>
        {pending ? "Menyimpan..." : "Lanjut"}
      </Button>
    </form>
  );
}
