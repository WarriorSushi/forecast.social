import "server-only";

import {
  compareResolutionValue,
  parseHttpJsonResolutionConfig,
  readJsonPath,
} from "./core";

export {
  compareResolutionValue,
  parseHttpJsonResolutionConfig,
  readJsonPath,
} from "./core";
export type { HttpJsonResolutionConfig } from "./core";

const ALLOWED_HOSTS = new Set([
  "api.coingecko.com",
  "api.open-meteo.com",
  "api.weather.gov",
  "api.github.com",
  "api.worldbank.org",
  "datausa.io",
]);

export type ResolutionEvaluation =
  | { status: "pending"; evidence: Record<string, unknown> }
  | {
      status: "resolved";
      outcome: "yes" | "no";
      evidence: Record<string, unknown>;
    };

export async function evaluateHttpJsonResolution(input: {
  config: unknown;
  resolvesAt: Date;
  now?: Date;
}): Promise<ResolutionEvaluation> {
  const config = parseHttpJsonResolutionConfig(input.config);
  const url = new URL(config.url);
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error(`Resolution host is not approved: ${url.hostname}`);
  }

  const response = await fetch(url, {
    cache: "no-store",
    headers: { "user-agent": "forecast.social-resolution-worker/1.0" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`Resolution source returned HTTP ${response.status}.`);
  }
  const payload: unknown = await response.json();
  const actual = readJsonPath(payload, config.path);
  const matched = compareResolutionValue(actual, config.operator, config.expected);
  const now = input.now ?? new Date();
  const evidence = {
    source: config.url,
    path: config.path,
    operator: config.operator,
    expected: config.expected,
    actual,
    matched,
    checkedAt: now.toISOString(),
    label: config.label ?? null,
  };

  if (matched && config.resolveEarlyOnMatch) {
    return { status: "resolved", outcome: config.outcomeOnMatch, evidence };
  }
  if (now.getTime() < input.resolvesAt.getTime()) {
    return { status: "pending", evidence };
  }
  return {
    status: "resolved",
    outcome: matched ? config.outcomeOnMatch : config.outcomeOnMiss,
    evidence,
  };
}
