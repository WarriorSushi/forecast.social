"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { proposeMarket } from "@/server/actions/proposals";
import {
  INITIAL_PROPOSE_MARKET_STATE,
  type ProposeMarketState,
} from "@/server/actions/proposals.types";

type Category = { slug: string; name: string };

export function ProposeMarketForm({
  categories,
  defaultClosesAt,
  defaultResolvesAt,
}: {
  categories: Category[];
  defaultClosesAt?: string;
  defaultResolvesAt?: string;
}) {
  const [state, formAction] = useActionState<ProposeMarketState, FormData>(
    proposeMarket,
    INITIAL_PROPOSE_MARKET_STATE,
  );
  const router = useRouter();
  const lastSeen = useRef<ProposeMarketState["status"]>("idle");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === lastSeen.current) return;
    lastSeen.current = state.status;
    if (state.status === "success") {
      toast.success("Proposal submitted. Watch your notifications.");
      formRef.current?.reset();
      router.refresh();
    } else if (state.status === "error" && !state.fieldErrors) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form action={formAction} ref={formRef} className="flex flex-col gap-5">
      <Field
        label="Title"
        name="title"
        placeholder="Will the Fed pause rates at the May 2026 FOMC meeting?"
        required
        error={state.status === "error" ? state.fieldErrors?.title : undefined}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="proposal-description">Resolution criteria</Label>
        <Textarea
          id="proposal-description"
          name="description"
          required
          rows={5}
          placeholder="Spell out what resolves Yes vs No. Link the public source of truth in the resolution-source field."
        />
        {state.status === "error" && state.fieldErrors?.description ? (
          <p className="text-caption text-signal-negative">
            {state.fieldErrors.description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="proposal-category">Category</Label>
        <Select
          name="category_slug"
          required
          defaultValue={categories[0]?.slug ?? "tech-ai"}
        >
          <SelectTrigger id="proposal-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Closes at"
          name="closes_at"
          type="datetime-local"
          required
          defaultValue={defaultClosesAt}
          error={
            state.status === "error"
              ? state.fieldErrors?.closes_at
              : undefined
          }
        />
        <Field
          label="Resolves at"
          name="resolves_at"
          type="datetime-local"
          required
          defaultValue={defaultResolvesAt}
          error={
            state.status === "error"
              ? state.fieldErrors?.resolves_at
              : undefined
          }
        />
      </div>

      <Field
        label="Resolution source"
        name="resolution_source"
        type="url"
        placeholder="https://www.federalreserve.gov/monetarypolicy.htm"
        required
        error={
          state.status === "error"
            ? state.fieldErrors?.resolution_source
            : undefined
        }
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="proposal-rationale">Rationale</Label>
        <Textarea
          id="proposal-rationale"
          name="rationale"
          required
          rows={3}
          placeholder="Why this question? How will it resolve cleanly? Anything an admin should know before approving."
        />
        {state.status === "error" && state.fieldErrors?.rationale ? (
          <p className="text-caption text-signal-negative">
            {state.fieldErrors.rationale}
          </p>
        ) : null}
      </div>

      {state.status === "error" && !state.fieldErrors ? (
        <p className="text-body-sm text-signal-negative">{state.message}</p>
      ) : null}

      <SubmitButton />
      <p className="text-caption text-muted-foreground">
        One proposal every 6 hours. Approved proposals credit you as the
        market author.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
}) {
  const id = `proposal-${name}`;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
      />
      {error ? (
        <p className="text-caption text-signal-negative">{error}</p>
      ) : null}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-11 self-start">
      {pending ? "Submitting…" : "Propose market"}
    </Button>
  );
}
