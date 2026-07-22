import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compareResolutionValue,
  parseHttpJsonResolutionConfig,
  readJsonPath,
} from "./core";

describe("automatic resolution core", () => {
  it("reads nested object and array paths", () => {
    const payload = { prices: [{ asset: { usd: 101_250 } }] };
    assert.equal(readJsonPath(payload, "prices.0.asset.usd"), 101_250);
    assert.equal(readJsonPath(payload, "prices.1.asset.usd"), undefined);
  });

  it("supports strict equality and numeric comparisons", () => {
    assert.equal(compareResolutionValue("released", "eq", "released"), true);
    assert.equal(compareResolutionValue(101_250, "gt", 100_000), true);
    assert.equal(compareResolutionValue(100_000, "gte", 100_000), true);
    assert.throws(() => compareResolutionValue("10", "gt", 9));
  });

  it("rejects malformed resolver configurations", () => {
    assert.throws(() =>
      parseHttpJsonResolutionConfig({
        url: "not-a-url",
        path: "price.usd",
        operator: "gt",
        expected: 100_000,
      }),
    );
  });
});
