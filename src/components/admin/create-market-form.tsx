"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMarket } from "@/server/actions/markets";
import {
  INITIAL_CREATE_MARKET_STATE,
  type CreateMarketState,
} from "@/server/actions/markets.types";

type CategoryOption = { slug: string; name: string };

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { slug: "tech-ai", name: "Tech & AI" },
  { slug: "crypto", name: "Crypto" },
  { slug: "sports", name: "Sports" },
  { slug: "pop-culture", name: "Pop culture" },
];

export function CreateMarketForm({
  categories = DEFAULT_CATEGORIES,
}: {
  categories?: CategoryOption[];
}) {
  const [state, formAction] = useActionState<CreateMarketState, FormData>(
    createMarket,
    INITIAL_CREATE_MARKET_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field
        label="Title"
        name="title"
        placeholder="Will the Fed pause rates at the May 2026 FOMC meeting?"
        required
        error={state.status === "error" ? state.fieldErrors?.title : undefined}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="market-description">Description</Label>
        <textarea
          id="market-description"
          name="description"
          required
          minLength={20}
          maxLength={1200}
          rows={5}
          placeholder="Describe the question clearly. What resolves Yes? What resolves No? Link the source of truth."
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-body resize-none outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 transition-[box-shadow,border-color]"
        />
        {state.status === "error" && state.fieldErrors?.description ? (
          <p className="text-caption text-signal-negative">
            {state.fieldErrors.description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="market-category">Category</Label>
        <select
          id="market-category"
          name="category_slug"
          required
          defaultValue="tech-ai"
          className="w-full rounded-md border border-input bg-transparent h-10 px-3 text-body outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 transition-[box-shadow,border-color]"
        >
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Closes at"
          name="closes_at"
          type="datetime-local"
          required
          error={
            state.status === "error" ? state.fieldErrors?.closes_at : undefined
          }
        />
        <Field
          label="Resolves at"
          name="resolves_at"
          type="datetime-local"
          required
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
        placeholder="https://… (URL of the authoritative source, optional)"
        error={
          state.status === "error"
            ? state.fieldErrors?.resolution_source
            : undefined
        }
      />

      {state.status === "error" && !state.fieldErrors ? (
        <p className="text-body-sm text-signal-negative">{state.message}</p>
      ) : null}

      {state.status === "success" ? (
        <p className="text-body-sm text-signal-positive">
          Created. Slug:{" "}
          <span className="font-mono">{state.slug}</span>
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  const id = `market-${name}`;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
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
      {pending ? "Creating…" : "Create market"}
    </Button>
  );
}
