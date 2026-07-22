"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  initialAuthState,
  type AuthState,
} from "@/server/actions/auth.types";

type Props = {
  /** Server action — must have the (prev, formData) signature. */
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  /** Label on the submit button — "Sign in" or "Create account". */
  submitLabel: string;
  /** Title above the form. */
  title: string;
  /** Subtitle just under the title. */
  subtitle: string;
  /** Show the invite-code field (sign-up only, when env requires it). */
  showInviteCode?: boolean;
  /** Initial invite-code value (from ?code= query param). */
  initialInviteCode?: string;
};

export function CredentialsForm({
  action,
  submitLabel,
  title,
  subtitle,
  showInviteCode = false,
  initialInviteCode = "",
}: Props) {
  const [state, formAction] = useActionState(action, initialAuthState);

  return (
    <div className="mx-auto flex max-w-[420px] flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-display-sm text-foreground leading-[1.05]">
          {title}
        </h1>
        <p className="text-body text-muted-foreground">{subtitle}</p>
      </header>

      <form action={formAction} className="flex flex-col gap-5" noValidate>
        <Field
          id="email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          required
          placeholder="you@forecast.social"
        />
        <Field
          id="password"
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="At least 8 characters"
        />

        {showInviteCode ? (
          <Field
            id="invite_code"
            name="invite_code"
            label="Invite code"
            type="text"
            defaultValue={initialInviteCode}
            required
            placeholder="ABC23XYZ"
          />
        ) : null}

        {state.error ? (
          <p
            role="alert"
            className="text-body-sm text-signal-negative -mt-1"
          >
            {state.error}
          </p>
        ) : null}

        <SubmitButton label={submitLabel} />
      </form>
    </div>
  );
}

function Field({
  id,
  name,
  label,
  type,
  autoComplete,
  defaultValue,
  required,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  type: "email" | "password" | "text";
  autoComplete?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-body-sm font-medium text-foreground">
        {label}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="h-11"
      />
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="h-12 mt-2"
    >
      {pending ? "Working…" : label}
    </Button>
  );
}
