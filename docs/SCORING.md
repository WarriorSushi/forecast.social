# SCORING.md — The Forecast Score

The Forecast Score is the heart of the product. Implement exactly as specified. Changes require explicit approval; this is the public scoreboard and stability matters.

## What we're measuring

Three things, weighted together:

1. **Calibration** — when you say 80%, does it happen 80% of the time? (Brier score.)
2. **Volume confidence** — more resolved predictions = more weight to your score.
3. **Streak vitality** — recent correct calls boost; long inactivity decays.

We are explicitly **not** measuring raw "correct vs wrong" count. A user who only ever predicts at 100% on lock-in markets isn't impressive; they're trivial. Calibration rewards real forecasting skill.

## 1. Per-prediction Brier score

When a market resolves, for each user's **final prediction** on that market (their most recent submission with `created_at < market.closes_at`):

```
let p = prediction.probability        // 0 to 1
let o = market.outcome === 'yes' ? 1 : 0
let brier = (p - o)^2                 // 0 (perfect) to 1 (worst)
```

A perfect prediction scores `brier = 0`. The worst possible scores `brier = 1`. Random scores `brier = 0.25`.

Write `brier` and `was_correct` (= `(p > 0.5 && o = 1) || (p < 0.5 && o = 0)`) onto the prediction row at resolution time.

Predictions on markets resolved as `invalid` are deleted from scoring (no brier, no impact).

## 2. Brier-derived skill component

We invert and scale Brier so higher = better and the number is meaningful.

```
let skill = max(0, 1 - 2 * brier)     // 1 = perfect, 0 = random, can't go below 0
```

The 2x factor is conventional: it maps Brier = 0.25 (random) to skill = 0.5, and Brier = 0 to skill = 1.

## 3. Aggregate user skill

For a user with N resolved predictions:

```
let skills = predictions.map(p => max(0, 1 - 2 * p.brier))
let mean_skill = average(skills)
```

Use a **shrinkage prior** so users with few predictions don't appear elite from luck:

```
let PRIOR_N = 8                       // pretend the user has 8 average-quality calls
let PRIOR_SKILL = 0.25                // slightly worse than random as prior

let shrunk_skill =
  (sum(skills) + PRIOR_N * PRIOR_SKILL)
  / (N + PRIOR_N)
```

This means a user with 1 perfect call has `shrunk_skill ≈ 0.33` (not 1.0), and a user with 100 well-calibrated calls converges to their real mean. Exactly the dynamic we want.

## 4. Streak multiplier

A "streak" is consecutive correct predictions on resolved markets, ordered by `resolved_at`. Reset to 0 on a wrong prediction.

```
let current_streak = …       // continually updated; stored on user row
let streak_bonus = min(0.20, 0.01 * current_streak)
//                 capped at +20%, gained at +1% per consecutive correct
```

Add this as a multiplier to skill at the score conversion step (below). Streaks should *boost* hot forecasters without dominating skill.

## 5. Activity / decay

```
let days_since_last_prediction = (now - user.last_prediction_at) / DAY
let decay =
  days_since_last_prediction <= 14 ? 1.00 :
  days_since_last_prediction <= 30 ? 0.95 :
  days_since_last_prediction <= 60 ? 0.85 :
  days_since_last_prediction <= 90 ? 0.70 :
                                     0.50
```

Decay applies as a multiplier. A user who hasn't predicted in 3 months keeps half their score. This keeps the leaderboard alive without erasing veteran calibrators.

## 6. The Forecast Score formula

```
let forecast_score =
  round(
    shrunk_skill
    * (1 + streak_bonus)
    * decay
    * 3000
  )
```

The 3000 multiplier is the public-facing scale. Why 3000?

- It's chess-ELO familiar (people understand 1500 = average, 2400+ = master).
- The cap allows for genuine differentiation between top forecasters.
- Pure mean skill of 0.5 (random) → ~750. So a "random" user sits well below master.

## 7. Per-category scores

Compute the same formula independently per category, using only predictions in that category. Stored in `user_category_scores`. A user may be 2100 on Tech and 850 on Sports.

The global Forecast Score uses **all** resolved predictions across categories, not an average of category scores. Cross-category breadth has its own value.

## 8. Volume gate (public visibility)

Don't publicly display a Forecast Score until the user has **≥ 5 resolved predictions**. Until then:

- Show "Unranked" on the profile.
- Internally compute the score so we don't have a backfill problem.
- Don't include unranked users in leaderboards.

This prevents a brand-new user from gaming the system or appearing distorted.

## 9. Rank

Rank is a `dense_rank() over (order by forecast_score desc)` across all ranked users. Compute once per recompute and cache on the user row. Also compute `rank_percentile = rank / total_ranked_users`. Surface "Top 1%" / "Top 5%" / "Top 10%" badges on profile.

For per-category ranks, do the same `dense_rank` per category.

## 10. When to recompute

- **On market resolution:** recompute every affected user's score.
- **Nightly cron (Inngest scheduled function):** recompute *every* ranked user's score to apply decay and rank shifts. Runs at 03:00 UTC.

Recompute is idempotent. Always read predictions fresh, never trust the stored score.

## 11. Edge cases

- **A user re-predicts on the same market.** Score uses the most recent prediction made *before* `market.closes_at`. Earlier predictions on that market are visible on the profile timeline but do not affect score.
- **Market resolves as `invalid`.** Predictions on it are excluded from scoring entirely. Update `total_predictions` and `correct_predictions` to drop them.
- **A user is deleted.** All predictions cascade-delete. Recompute is unaffected.
- **A market is re-resolved (admin correction).** Old predictions' `brier` and `was_correct` recompute. Streaks may shift. Run a full recompute for affected users.

## 12. Reference implementation (TypeScript)

```ts
// lib/scoring/score.ts
type Prediction = {
  probability: number;          // 0..1
  outcome: 'yes' | 'no';        // exclude 'invalid' beforehand
  resolvedAt: Date;
};

const PRIOR_N = 8;
const PRIOR_SKILL = 0.25;
const SCALE = 3000;

function brier(p: number, outcomeYes: boolean) {
  return (p - (outcomeYes ? 1 : 0)) ** 2;
}

function skill(b: number) {
  return Math.max(0, 1 - 2 * b);
}

function shrunkSkill(skills: number[]) {
  const n = skills.length;
  const sum = skills.reduce((a, b) => a + b, 0);
  return (sum + PRIOR_N * PRIOR_SKILL) / (n + PRIOR_N);
}

function streakBonus(currentStreak: number) {
  return Math.min(0.20, 0.01 * currentStreak);
}

function decayFor(daysIdle: number) {
  if (daysIdle <= 14) return 1.00;
  if (daysIdle <= 30) return 0.95;
  if (daysIdle <= 60) return 0.85;
  if (daysIdle <= 90) return 0.70;
  return 0.50;
}

export function computeForecastScore(input: {
  predictions: Prediction[];
  currentStreak: number;
  daysIdle: number;
}): number {
  if (input.predictions.length === 0) return 0;
  const skills = input.predictions.map(p =>
    skill(brier(p.probability, p.outcome === 'yes')),
  );
  const score =
    shrunkSkill(skills) *
    (1 + streakBonus(input.currentStreak)) *
    decayFor(input.daysIdle) *
    SCALE;
  return Math.round(score);
}
```

Mirror this for per-category — same function, filtered prediction array.

## 13. Don't over-engineer

We are explicitly **not** using ELO head-to-head, log-score, or other exotic formulations in v1. Brier + shrinkage + streak + decay covers 95% of what we need and is explainable in one tweet:

> "We use Brier scoring, the gold standard for probabilistic forecasts. Your score rewards calibration, not coin flips."

That's the marketing.
