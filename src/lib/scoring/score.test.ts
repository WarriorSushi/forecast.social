import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SCALE,
  VOLUME_GATE,
  brier,
  computeForecastScore,
  computeStreaks,
  decayFor,
  shrunkSkill,
  skill,
  streakBonus,
  wasCorrect,
} from "./score";

describe("Forecast Score", () => {
  it("computes Brier scores and skill at the important boundaries", () => {
    assert.equal(brier(1, true), 0);
    assert.equal(brier(0, false), 0);
    assert.equal(brier(0.5, true), 0.25);
    assert.equal(brier(0, true), 1);
    assert.equal(skill(0), 1);
    assert.equal(skill(0.25), 0.5);
    assert.equal(skill(1), 0);
  });

  it("applies the documented shrinkage prior", () => {
    assert.equal(shrunkSkill([1]), 1 / 3);
    assert.equal(VOLUME_GATE, 5);
  });

  it("uses strict confidence for correctness", () => {
    assert.equal(wasCorrect(0.5, true), false);
    assert.equal(wasCorrect(0.5, false), false);
    assert.equal(wasCorrect(0.51, true), true);
    assert.equal(wasCorrect(0.49, false), true);
  });

  it("caps streak bonus and follows every decay boundary", () => {
    assert.equal(streakBonus(-1), 0);
    assert.equal(streakBonus(5), 0.05);
    assert.equal(streakBonus(20), 0.2);
    assert.equal(streakBonus(200), 0.2);
    assert.equal(decayFor(14), 1);
    assert.equal(decayFor(15), 0.95);
    assert.equal(decayFor(30), 0.95);
    assert.equal(decayFor(31), 0.85);
    assert.equal(decayFor(60), 0.85);
    assert.equal(decayFor(61), 0.7);
    assert.equal(decayFor(90), 0.7);
    assert.equal(decayFor(91), 0.5);
  });

  it("tracks current and longest streaks", () => {
    assert.deepEqual(
      computeStreaks([
        { wasCorrect: true },
        { wasCorrect: true },
        { wasCorrect: false },
        { wasCorrect: true },
        { wasCorrect: true },
        { wasCorrect: true },
      ]),
      { current: 3, longest: 3 },
    );
  });

  it("rewards better forecasts and never leaves the public score range", () => {
    const perfect = Array.from({ length: 10_000 }, () => ({
      probability: 1,
      outcome: "yes" as const,
    }));
    const weak = Array.from({ length: 100 }, () => ({
      probability: 0.55,
      outcome: "yes" as const,
    }));

    const perfectScore = computeForecastScore({
      predictions: perfect,
      currentStreak: 100,
      daysIdle: 0,
    });
    const weakScore = computeForecastScore({
      predictions: weak,
      currentStreak: 0,
      daysIdle: 0,
    });

    assert.equal(perfectScore, SCALE);
    assert.ok(weakScore > 0);
    assert.ok(perfectScore > weakScore);
  });
});
