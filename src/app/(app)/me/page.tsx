import { EmptyState } from "@/components/app/empty-state";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <EmptyState
      overline="profile · phase 1"
      title="No score yet."
      body="A Forecast Score appears here once you've resolved at least five predictions. Until then your profile is unranked."
      cta={{ label: "Back to feed", href: "/feed" }}
    />
  );
}
