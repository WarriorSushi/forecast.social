import { EmptyState } from "@/components/app/empty-state";

export const metadata = { title: "Predict" };

export default function PredictPage() {
  return (
    <EmptyState
      overline="predict · phase 3"
      title="No market to call yet."
      body="When markets are live, this is where you'll find one to predict. Drag the slider, lock the call. The receipt is the product."
      cta={{ label: "Browse markets", href: "/markets" }}
    />
  );
}
