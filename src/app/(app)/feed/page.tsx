import { EmptyState } from "@/components/app/empty-state";

export const metadata = { title: "Feed" };

export default function FeedPage() {
  return (
    <EmptyState
      overline="feed · phase 5"
      title="Nothing to call yet."
      body="Predictions from people you follow and trending markets will appear here once you start following forecasters."
      cta={{ label: "Browse markets", href: "/markets" }}
    />
  );
}
