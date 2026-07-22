"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboarding } from "@/server/actions/profile";
import { initialOnboardingState } from "@/server/actions/profile.types";

export function OnboardingForm({
  defaultUsername,
  defaultDisplayName,
  topics,
}: {
  defaultUsername?: string;
  defaultDisplayName?: string;
  topics: Array<{ slug: string; name: string }>;
}) {
  const [state, formAction] = useActionState(
    completeOnboarding,
    initialOnboardingState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="username" className="text-overline text-muted-foreground">
          Username
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-body-sm pointer-events-none">
            @
          </span>
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            required
            placeholder="warriorsushi"
            defaultValue={state.username ?? defaultUsername}
            className="h-11 pl-7 font-mono"
            maxLength={20}
          />
        </div>
        <p className="text-caption text-muted-foreground">
          3–20 characters. Lowercase letters, numbers, and underscores.
          Permanent. Choose well.
        </p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-overline text-muted-foreground">
          What do you follow?
        </legend>
        <p className="text-caption text-muted-foreground">
          Choose 2–4. This only picks your starter questions.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {topics.map((topic) => (
            <label
              key={topic.slug}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-body-sm text-foreground transition-colors has-[:checked]:border-foreground has-[:checked]:bg-muted"
            >
              <input
                type="checkbox"
                name="interests"
                value={topic.slug}
                className="size-4 accent-current"
              />
              {topic.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName" className="text-overline text-muted-foreground">
          Display name
        </Label>
        <Input
          id="displayName"
          name="displayName"
          type="text"
          required
          placeholder="Your real name or handle"
          defaultValue={state.displayName ?? defaultDisplayName}
          className="h-11"
          maxLength={40}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-body-sm text-signal-negative -mt-1">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="h-12 mt-2">
      {pending ? "Saving…" : "Choose my questions"}
    </Button>
  );
}
