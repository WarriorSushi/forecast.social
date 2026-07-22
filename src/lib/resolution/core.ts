import { z } from "zod";

const httpJsonResolutionConfigSchema = z.object({
  url: z.string().url(),
  path: z.string().min(1).max(240),
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte"]),
  expected: z.union([z.string(), z.number(), z.boolean()]),
  outcomeOnMatch: z.enum(["yes", "no"]).default("yes"),
  outcomeOnMiss: z.enum(["yes", "no"]).default("no"),
  resolveEarlyOnMatch: z.boolean().default(true),
  label: z.string().max(160).optional(),
});

export type HttpJsonResolutionConfig = z.infer<
  typeof httpJsonResolutionConfigSchema
>;

export function parseHttpJsonResolutionConfig(value: unknown) {
  return httpJsonResolutionConfigSchema.parse(value);
}

export function readJsonPath(value: unknown, path: string): unknown {
  const segments = path.split(".").filter(Boolean);
  let current: unknown = value;
  for (const segment of segments) {
    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      current = current[Number(segment)];
      continue;
    }
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function compareResolutionValue(
  actual: unknown,
  operator: HttpJsonResolutionConfig["operator"],
  expected: string | number | boolean,
): boolean {
  if (operator === "eq") return actual === expected;
  if (operator === "neq") return actual !== expected;
  if (typeof actual !== "number" || typeof expected !== "number") {
    throw new Error(`Operator ${operator} requires numeric values.`);
  }
  if (operator === "gt") return actual > expected;
  if (operator === "gte") return actual >= expected;
  if (operator === "lt") return actual < expected;
  return actual <= expected;
}
