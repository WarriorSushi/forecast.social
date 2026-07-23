"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  applyForEarlyAccess,
  type EarlyAccessState,
} from "@/server/actions/early-access";

const TOPICS = ["AI & tech", "Business", "Sports", "Entertainment"] as const;
const INITIAL_EARLY_ACCESS_STATE: EarlyAccessState = { status: "idle" };

export function EarlyAccessForm() {
  const [state, action] = useActionState(
    applyForEarlyAccess,
    INITIAL_EARLY_ACCESS_STATE,
  );

  if (state.status === "success") {
    return (
      <div className="border-y border-border py-8">
        <span className="grid size-10 place-items-center rounded-full bg-foreground text-background">
          <Check className="size-5" />
        </span>
        <h2 className="mt-5 font-display text-headline text-foreground">You are on the list.</h2>
        <p className="mt-2 text-body text-muted-foreground">
          We review every request. If there is a fit, your private invitation will arrive by email.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <div
        aria-hidden="true"
        className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
      >
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="early-email" name="email" label="Email" placeholder="you@example.com" type="email" required />
        <Field id="early-handle" name="handle" label="X or Reddit handle (optional)" placeholder="@yourname" />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-body-sm font-medium text-foreground">What do you follow?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TOPICS.map((topic) => (
            <label key={topic} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-body-sm has-[:checked]:border-foreground has-[:checked]:bg-muted">
              <input type="checkbox" name="interests" value={topic} className="size-4 accent-current" />
              {topic}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="early-prediction">A call you would put on record (optional)</Label>
        <Textarea id="early-prediction" name="prediction" maxLength={280} placeholder="Example: GTA VI will slip again, 70%." />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="early-source">How did you hear about us? (optional)</Label>
        <Input id="early-source" name="source" maxLength={80} placeholder="X, Reddit, a friend, a newsletter" />
      </div>

      {state.status === "error" ? (
        <p role="alert" className="text-body-sm text-signal-negative">{state.message}</p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function Field({ id, name, label, placeholder, type = "text", required = false }: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  type?: "text" | "email";
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} required={required} placeholder={placeholder} />
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="lg" disabled={pending}>{pending ? "Submitting…" : "Request an invitation"}</Button>;
}
