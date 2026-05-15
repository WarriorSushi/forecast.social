import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * /predict is a shortcut into the market browsing experience. With the
 * markets list live in Phase 2, predicting is "pick a market, drag the
 * slider." The dedicated landing here would just duplicate /markets.
 */
export default function PredictPage() {
  redirect("/markets?sort=closing-soon");
}
