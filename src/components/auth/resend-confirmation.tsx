"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  initialAuthState,
  type AuthState,
} from "@/server/actions/auth.types";

type Props = {
  email: string;
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
};

export function ResendConfirmation({ email, action }: Props) {
  const [state, formAction] = useActionState(action, initialAuthState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="email" value={email} />
      <ResendButton />
      {state.error ? (
        <p className="text-body-sm text-signal-negative">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-body-sm text-signal-positive">{state.message}</p>
      ) : null}
    </form>
  );
}

function ResendButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="-ml-3"
    >
      {pending ? "Sending…" : "Resend the email"}
    </Button>
  );
}
