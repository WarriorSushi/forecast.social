import { EmptyState } from "@/components/app/empty-state";

export const metadata = { title: "Markets" };

export default function MarketsPage() {
  return (
    <EmptyState
      overline="markets · phase 2"
      title="No markets open yet."
      body="The first batch of markets across Tech & AI, Crypto, Sports, and Pop Culture goes live with the public launch."
      cta={{ label: "Read the manifesto", href: "/manifesto" }}
    />
  );
}
