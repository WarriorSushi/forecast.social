"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import { configureMarketResolution } from "@/server/actions/markets";
import { resolveMarket } from "@/server/actions/resolve-market";

type Outcome = "yes" | "no" | "invalid";

/**
 * Admin-only "Resolve as Yes / No / Invalid" panel. Renders on the
 * market detail page beneath the prediction slider when the viewer is
 * an admin and the market isn't already resolved. Server action does
 * the work — including synchronous score recompute for every predictor.
 */
export function ResolveMarketPanel({
  marketId,
  alreadyResolved,
  resolutionMethod,
  resolutionStatus,
  resolutionConfig,
}: {
  marketId: string;
  alreadyResolved: boolean;
  resolutionMethod: string;
  resolutionStatus: string;
  resolutionConfig: Record<string, unknown> | null;
}) {
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState(resolutionMethod);
  const config = resolutionConfig ?? {};

  function submit(outcome: Outcome) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("outcome", outcome);
      fd.set("notes", notes);
      const result = await resolveMarket(fd);
      if (result.status === "ok") {
        toast.success(
          `Resolved as ${result.outcome}. ${result.affectedUsers} forecaster${result.affectedUsers === 1 ? "" : "s"} recomputed.`,
        );
        setNotes("");
      } else {
        toast.error(result.message);
      }
    });
  }

  function saveAutomation(formData: FormData) {
    formData.set("marketId", marketId);
    formData.set("method", method);
    startTransition(async () => {
      const result = await configureMarketResolution(formData);
      if (result.status === "success") toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="border-t border-border pt-6 flex flex-col gap-7">
      <form action={saveAutomation} className="flex flex-col gap-4">
        <div>
          <p className="text-overline text-muted-foreground">
            resolution machinery · {resolutionStatus}
          </p>
          <p className="mt-2 text-body-sm text-muted-foreground">
            Use automation only for a stable, machine-readable source. Failures
            stop in the review queue; they never guess an outcome.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="resolution-method">Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger id="resolution-method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual review</SelectItem>
              <SelectItem value="http_json">Automatic JSON source</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {method === "http_json" ? (
          <div className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4">
            <AdminField
              label="Source URL"
              name="url"
              defaultValue={stringValue(config.url)}
              placeholder="https://api.coingecko.com/api/v3/…"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField
                label="JSON path"
                name="path"
                defaultValue={stringValue(config.path)}
                placeholder="bitcoin.usd"
              />
              <div className="flex flex-col gap-2">
                <Label htmlFor="resolution-operator">Comparison</Label>
                <Select
                  name="operator"
                  defaultValue={stringValue(config.operator) || "eq"}
                >
                  <SelectTrigger id="resolution-operator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eq">equals</SelectItem>
                    <SelectItem value="neq">does not equal</SelectItem>
                    <SelectItem value="gt">is greater than</SelectItem>
                    <SelectItem value="gte">is at least</SelectItem>
                    <SelectItem value="lt">is less than</SelectItem>
                    <SelectItem value="lte">is at most</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField
                label="Expected value"
                name="expected"
                defaultValue={stringValue(config.expected)}
                placeholder="100000"
              />
              <div className="flex flex-col gap-2">
                <Label htmlFor="resolution-expected-type">Value type</Label>
                <Select
                  name="expectedType"
                  defaultValue={
                    typeof config.expected === "number"
                      ? "number"
                      : typeof config.expected === "boolean"
                        ? "boolean"
                        : "string"
                  }
                >
                  <SelectTrigger id="resolution-expected-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="string">Text</SelectItem>
                    <SelectItem value="boolean">True / false</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <AdminField
              label="Evidence label (optional)"
              name="label"
              defaultValue={stringValue(config.label)}
              placeholder="CoinGecko BTC/USD"
            />
            <input type="hidden" name="outcomeOnMatch" value="yes" />
            <input type="hidden" name="outcomeOnMiss" value="no" />
            <label className="flex items-start gap-3 text-body-sm text-muted-foreground">
              <input
                type="checkbox"
                name="resolveEarlyOnMatch"
                defaultChecked={config.resolveEarlyOnMatch !== false}
                className="mt-1"
              />
              Resolve Yes as soon as the condition matches. Otherwise, wait
              until the scheduled resolution time and resolve No if it misses.
            </label>
          </div>
        ) : null}

        <Button
          type="submit"
          variant="outline"
          disabled={pending}
          className="self-start"
        >
          {pending ? "Saving…" : "Save resolution method"}
        </Button>
      </form>

      <div className="flex flex-col gap-4 border-t border-border pt-6">
      <div>
        <p className="text-overline text-muted-foreground">
          admin · {alreadyResolved ? "re-resolve" : "resolve"}
        </p>
        <p className="mt-2 text-body-sm text-muted-foreground">
          {alreadyResolved
            ? "Re-resolving updates the outcome and re-runs scoring for every predictor."
            : "Picking an outcome runs scoring for everyone who called this market."}
        </p>
      </div>

      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional note (audit log)…"
        rows={2}
        className="text-body-sm"
      />

      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={pending}
          onClick={() => submit("yes")}
        >
          Resolve Yes
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={pending}
          onClick={() => submit("no")}
        >
          Resolve No
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 text-muted-foreground"
          disabled={pending}
          onClick={() => submit("invalid")}
        >
          Invalid
        </Button>
      </div>
      </div>
    </div>
  );
}

function AdminField({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`resolution-${name}`}>{label}</Label>
      <Input
        id={`resolution-${name}`}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={name !== "label"}
      />
    </div>
  );
}

function stringValue(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value);
}
