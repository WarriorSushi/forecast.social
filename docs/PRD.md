# PRD.md — forecast.social

## 1. The product, in one line

**The social network where being right is the only currency.** Predict anything. Build a track record. Get famous for your foresight, not your follower count.

## 2. The insight

Polymarket has markets but feels like a Bloomberg terminal. Manifold has play money but feels like a forum. X has the conversation but no scorekeeping — anyone can claim they "called it" after the fact.

No one has built the social network where your **prediction track record is your identity**. That is the gap. Your profile isn't "10K followers." It's "Top 1% on Tech, 73% accuracy over 412 predictions, 47-day streak."

Reputation, not money, is the unit. This makes the product:

- Legal in every jurisdiction (no gambling regulation).
- Halal by design (no maysir, no gharar) — quiet feature, not loud positioning.
- Accessible to anyone with an opinion (students, kids, anyone gambling-averse).
- Genuinely social — because predictions without bragging rights are pointless.

## 3. Audience

**Primary (first 10K users):** Tech Twitter, crypto Twitter, sports Twitter. People who already make public predictions for clout but have no permanent scoreboard. Ages 18–34.

**Secondary:** Sports fans who want to prove they "knew it." Movie / awards / music fans. AI enthusiasts tracking model releases and Apple events.

**Beachhead community:** Crypto Twitter. They predict constantly, screenshot wins, get roasted for losses. There is no leaderboard. We become the leaderboard.

**Not the audience for v1:** Professional forecasters / superforecasters (too small, too slow), general consumers (no hook), enterprise (no need).

## 4. Positioning vs alternatives

| Product       | Money? | Social? | Scoreboard? | Vibe                |
|---------------|--------|---------|-------------|---------------------|
| Polymarket    | Yes    | No      | No          | Trading terminal    |
| Manifold      | Play   | Some    | Weak        | Forum               |
| Kalshi        | Yes    | No      | No          | Regulated exchange  |
| X / Twitter   | No     | Yes     | None        | Memory hole         |
| **forecast.social** | **No**     | **Yes**     | **Permanent**   | **Track record social** |

We win on: scoreboard permanence, social feel, legal everywhere, sharable receipts.

## 5. Core mechanics

### 5.1 Markets

A market is a probability question with:

- **Title** — e.g., "Will GPT-5 launch before July 1, 2026?"
- **Description** — context, what counts as resolution.
- **Category** — Tech & AI, Crypto, Sports, Pop Culture (at launch; expandable).
- **Resolution date** — when we resolve it.
- **Resolution source** — a URL or rule that determines the outcome.
- **Outcome** — Yes / No / Invalid. Set when the market resolves.
- **Created by** — admin (v1) or verified user (v2).

Markets seed the social graph. At launch the admin (you) creates 30–50 markets across the four categories.

### 5.2 Predictions

A prediction is a single user assigning a **probability 0–100%** to a market.

- Once submitted, a prediction is **locked**. It cannot be edited.
- A user can submit additional predictions on the same market over time (the timeline of their belief is itself shareable).
- The user's "current" prediction is their most recent one for scoring purposes.
- Predictions show a public timestamp and the market consensus at the moment of submission ("when nobody else thought so").

**Why probabilities, not yes/no:** Binary picks lose information. "I said 80%" is more interesting than "I said yes," and Brier-style scoring rewards calibration, which is what real forecasting is about.

### 5.3 Resolution

- Admin resolves markets via the admin panel by setting outcome = Yes / No / Invalid.
- On resolution: all predictions are scored, user Forecast Scores are recalculated, streaks updated, share cards generated, notifications fired.
- Resolution is a queued background job (see `ARCHITECTURE.md`).

### 5.4 The Forecast Score

A single number, 0–3000, that represents a user's forecasting skill. Visible on every profile. The full algorithm is in `SCORING.md`. Summary:

- Foundation: **Brier score** (rewards calibrated probabilities).
- Multiplier: **streak bonus** (consecutive correct calls compound).
- Volume gate: minimum 5 resolved predictions before a score is shown publicly.
- Categories: each user has a global score plus per-category sub-scores (Tech, Crypto, Sports, Pop Culture).
- Decay: slow inactivity decay so the leaderboard stays alive.

### 5.5 Social layer

- **Feed** — chronological in v1. Predictions from people you follow + trending markets.
- **Profile** — Forecast Score hero, category radar, recent calls (wins highlighted), longest streaks, prediction history.
- **Receipts** — every resolved correct prediction generates a shareable image card. One-tap download / share to X, Instagram, WhatsApp.
- **Threads** — every market has a Reddit-style discussion. Predictions can be quoted into the thread.
- **Follow** — one-way, like X.
- **Notifications** — bell icon. New follower, market you predicted on resolved, someone you follow made a bold call (>80% or <20%).

### 5.6 Market submission (v2, not v1)

Users will eventually submit markets for admin approval. Out of scope for v1 launch.

## 6. Launch markets

Seed 40–50 markets across these categories at launch. Mix of 1-week, 1-month, 3-month, 6-month horizons.

- **Tech & AI** — Model launches (GPT-5, Claude Opus 5, Gemini 3), Apple events, IPO outcomes, product ship dates.
- **Crypto** — BTC/ETH price milestones by date, ETF approvals, protocol mainnet launches, regulatory rulings.
- **Sports** — NFL/NBA/Premier League outcomes, season MVP, championship odds, transfer rumors.
- **Pop Culture** — Box office #1, Grammy/Oscar winners, Billboard #1, album release dates.

## 7. UX principles

1. **Numbers are the hero.** Score, percentage, streak, days-to-resolve — these are display-typography moments, not body text. Use the monospace face for tickers.
2. **Every win is shareable.** Build the share-card before you build the feed. The share card is the marketing.
3. **Show the path, not just the verdict.** Render consensus probability as a graph evolving over time. The chart is the receipt.
4. **Confidence is a feature.** The product has opinions. Copy is direct, slightly cocky. "You called it." "Receipts." "Top 1%."
5. **Mobile-first, always.** Every screen designed for 390px first.
6. **Restraint over decoration.** Don't add a thing unless it serves the product. The premium feel comes from typography, space, and motion — not gradients and noise.

## 8. Monetization (post-launch)

Confirmed for v2+, **none in v1**:

1. **Sponsored markets** — a brand sponsors a topical market ("Predict the next iPhone feature, sponsored by [tech publication]").
2. **Creator subscriptions** — top forecasters can sell paid analysis newsletters from their profile. 90/10 split (creator/platform).

Free forever for users. No banner ads. No paywalls on core features.

## 9. Out of scope for v1

- User-created markets (admin-only at launch).
- Native iOS / Android apps (PWA for now).
- Real money. Ever.
- DMs (use the comment threads).
- Algorithmic feed ranking (chronological with simple trending mix).
- Multi-language (English-only at launch; i18n-ready folder structure).
- Comments on profiles (only on markets).
- Public API.

## 10. Success metrics

**Pre-product-market-fit signals (first 90 days):**

- 1,000 weekly active predictors.
- 60% of users make a second prediction within 7 days of their first.
- 25% of resolved correct predictions get shared externally.
- Median session contains ≥3 predictions or ≥3 market views.

**Anti-metrics (do not chase):**

- Raw signup count.
- Vanity follower counts.
- "Time spent" — we want predictions per session, not minutes per session.

## 11. The moat

The data. After 12 months we have a verified prediction track record for thousands of forecasters that does not exist anywhere else. That becomes:

- A media asset (CNBC, Bloomberg want "what do the top forecasters predict?").
- A B2B asset (hedge funds, journalists, sponsors).
- An unfakeable reputation graph.

Copycats can copy features. They cannot copy 12 months of resolved predictions tied to identities. The longer we exist, the wider the moat.

## 12. Brand

- **Name:** forecast.social
- **One-liner:** The track-record social network.
- **Voice:** Confident, slightly cocky, data-honest. Not memey. Not corporate.
- **Taglines (rotation):** "Be right. Get famous." / "Receipts for everything." / "Calls, not chatter."
- **Visual direction:** Editorial meets terminal. See `DESIGN.md`.
