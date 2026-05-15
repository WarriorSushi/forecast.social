/**
 * Forecast Score — the heart of the product. Implemented exactly per
 * SCORING.md. Changes here require explicit approval; this is the
 * public scoreboard and stability matters.
 *
 * Reads predictions, returns a score in [0, 3000]. Pure function. No I/O.
 */

export type Prediction = {
  probability: number; // 0..1
  outcome: "yes" | "no"; // exclude "invalid" before calling
};

export const PRIOR_N = 8;
export const PRIOR_SKILL = 0.25;
export const SCALE = 3000;
export const VOLUME_GATE = 5;

/** Brier score for one prediction. 0 = perfect, 1 = worst. */
export function brier(p: number, outcomeYes: boolean): number {
  return (p - (outcomeYes ? 1 : 0)) ** 2;
}

/** Brier → skill in [0, 1]. */
export function skill(b: number): number {
  return Math.max(0, 1 - 2 * b);
}

/** Shrinks the user's mean skill toward a weak prior so few-call users
 * don't appear elite. PRIOR_N pretend calls at PRIOR_SKILL each. */
export function shrunkSkill(skills: number[]): number {
  const n = skills.length;
  const sum = skills.reduce((a, b) => a + b, 0);
  return (sum + PRIOR_N * PRIOR_SKILL) / (n + PRIOR_N);
}

/** +1% per consecutive correct, capped at +20%. */
export function streakBonus(currentStreak: number): number {
  return Math.min(0.2, 0.01 * Math.max(0, currentStreak));
}

/** Activity decay schedule (SCORING.md §5). */
export function decayFor(daysIdle: number): number {
  if (daysIdle <= 14) return 1.0;
  if (daysIdle <= 30) return 0.95;
  if (daysIdle <= 60) return 0.85;
  if (daysIdle <= 90) return 0.7;
  return 0.5;
}

/**
 * Was this prediction "correct"? The spec defines correct as:
 *   (p > 0.5 && outcome === 'yes') || (p < 0.5 && outcome === 'no')
 *
 * Exactly 0.5 is intentionally not counted as correct on either side.
 */
export function wasCorrect(p: number, outcomeYes: boolean): boolean {
  return (p > 0.5 && outcomeYes) || (p < 0.5 && !outcomeYes);
}

/**
 * Computes the final Forecast Score. Mirror this for per-category by
 * passing only the predictions in that category.
 *
 * Returns 0 when there are no predictions.
 */
export function computeForecastScore(input: {
  predictions: Prediction[];
  currentStreak: number;
  daysIdle: number;
}): number {
  if (input.predictions.length === 0) return 0;

  const skills = input.predictions.map((p) =>
    skill(brier(p.probability, p.outcome === "yes")),
  );

  const score =
    shrunkSkill(skills) *
    (1 + streakBonus(input.currentStreak)) *
    decayFor(input.daysIdle) *
    SCALE;

  return Math.round(score);
}

/**
 * Walks a chronologically-ordered list of resolved predictions and
 * returns the user's longest and current streak of correct calls. The
 * "current" streak counts trailing correct calls; the "longest" tracks
 * the maximum run seen.
 *
 * Predictions on `invalid` markets are excluded by the caller. Order is
 * by `resolved_at` ascending (oldest first), per SCORING.md §4.
 */
export function computeStreaks(
  resolved: { wasCorrect: boolean }[],
): { current: number; longest: number } {
  let current = 0;
  let longest = 0;
  let trailing = 0;
  for (const r of resolved) {
    if (r.wasCorrect) {
      current++;
      trailing = current;
      if (current > longest) longest = current;
    } else {
      current = 0;
      trailing = 0;
    }
  }
  return { current: trailing, longest };
}

/**
 * Inline sanity checks. Cheap to run; fail loudly if the algorithm
 * drifts. Invoked once at module load in dev so a regression in the
 * scoring math is caught immediately, not on a Friday at 3am.
 */
function selfCheck() {
  // Brier mathematics
  if (Math.abs(brier(1, true)) > 1e-9) throw new Error("brier perfect yes");
  if (Math.abs(brier(0, false)) > 1e-9) throw new Error("brier perfect no");
  if (Math.abs(brier(0.5, true) - 0.25) > 1e-9) throw new Error("brier random");

  // Skill mapping
  if (Math.abs(skill(0) - 1) > 1e-9) throw new Error("skill perfect");
  if (Math.abs(skill(0.25) - 0.5) > 1e-9) throw new Error("skill random");
  if (skill(0.6) !== 0) throw new Error("skill clamp at 0");

  // Shrinkage: one perfect call ≠ score of 1.
  const sShrunk = shrunkSkill([1]);
  if (Math.abs(sShrunk - (1 + 8 * 0.25) / (1 + 8)) > 1e-9) {
    throw new Error("shrinkage wrong");
  }
  // Approx 0.333 with one perfect call (matches SCORING.md §3).
  if (Math.abs(sShrunk - 0.3333333333333333) > 1e-9) {
    throw new Error("shrinkage one-call magnitude");
  }

  // Streak bonus
  if (streakBonus(0) !== 0) throw new Error("streak 0");
  if (Math.abs(streakBonus(5) - 0.05) > 1e-9) throw new Error("streak 5");
  if (streakBonus(50) !== 0.2) throw new Error("streak cap");

  // Decay
  if (decayFor(0) !== 1.0) throw new Error("decay 0");
  if (decayFor(15) !== 0.95) throw new Error("decay 15");
  if (decayFor(91) !== 0.5) throw new Error("decay deep");

  // wasCorrect at exactly 0.5: spec says strict > / <, so 0.5 is NOT
  // counted as correct either way.
  if (wasCorrect(0.5, true)) throw new Error("0.5 yes correct");
  if (wasCorrect(0.5, false)) throw new Error("0.5 no correct");
  if (!wasCorrect(0.51, true)) throw new Error("0.51 yes correct");
  if (!wasCorrect(0.49, false)) throw new Error("0.49 no correct");

  // End-to-end: 100 perfectly-calibrated calls, no streak, fresh.
  const perfect = Array.from({ length: 100 }, () => ({
    probability: 1,
    outcome: "yes" as const,
  }));
  const score = computeForecastScore({
    predictions: perfect,
    currentStreak: 0,
    daysIdle: 0,
  });
  // shrunk = (100 + 2)/(108) ≈ 0.9444 ; *3000 ≈ 2833.
  if (score < 2820 || score > 2840) {
    throw new Error(`end-to-end perfect score off: ${score}`);
  }

  // Streaks
  const streaks = computeStreaks([
    { wasCorrect: true },
    { wasCorrect: true },
    { wasCorrect: false },
    { wasCorrect: true },
    { wasCorrect: true },
    { wasCorrect: true },
  ]);
  if (streaks.current !== 3) throw new Error("streak current");
  if (streaks.longest !== 3) throw new Error("streak longest");
}

if (process.env.NODE_ENV !== "production") {
  try {
    selfCheck();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("scoring self-check failed:", err);
    throw err;
  }
}
