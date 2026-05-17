import Link from "next/link";

import { EditProfileForm } from "@/components/app/edit-profile-form";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getCurrentProfile } from "@/lib/auth";
import { signOut } from "@/server/actions/auth";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  // (app) layout has already gated us — profile is guaranteed.
  const profile = await getCurrentProfile();
  if (!profile) return null;

  return (
    <div className="max-w-2xl flex flex-col gap-14">
      <header className="flex flex-col gap-3">
        <p className="text-overline text-muted-foreground">settings</p>
        <h1 className="font-display text-display-sm text-foreground leading-[1.05]">
          Your account.
        </h1>
      </header>

      {/* ============================================================
          Profile
      ============================================================ */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-title text-foreground">Profile</h2>
          <p className="text-body-sm text-muted-foreground">
            How you appear on{" "}
            <Link
              href={`/u/${profile.username}`}
              className="text-foreground hover:underline underline-offset-4"
            >
              your profile
            </Link>
            .
          </p>
        </div>
        <AvatarUpload
          userId={profile.id}
          initialUrl={profile.avatar_url}
          initialFallback={getInitials(profile.display_name)}
        />
        <EditProfileForm
          defaultDisplayName={profile.display_name}
          defaultBio={profile.bio ?? ""}
        />
      </section>

      <Separator />

      {/* ============================================================
          Account — read-only for Phase 1
      ============================================================ */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-title text-foreground">Account</h2>
          <p className="text-body-sm text-muted-foreground">
            Permanent details. Username changes are coming later.
          </p>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-6 gap-y-3 text-body-sm">
          <dt className="text-muted-foreground">Username</dt>
          <dd className="font-mono text-foreground">@{profile.username}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-mono text-foreground break-all">
            {profile.email ?? "Not set"}
          </dd>
          <dt className="text-muted-foreground">Member since</dt>
          <dd className="font-mono text-foreground">
            {new Intl.DateTimeFormat("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }).format(profile.created_at)}
          </dd>
        </dl>
      </section>

      <Separator />

      {/* ============================================================
          Sign out
      ============================================================ */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-title text-foreground">
            Sign out
          </h2>
          <p className="text-body-sm text-muted-foreground">
            You&apos;ll need your password to sign back in.
          </p>
        </div>
        <form action={signOut}>
          <Button
            type="submit"
            variant="outline"
            className="self-start text-signal-negative hover:text-signal-negative hover:border-signal-negative/60"
          >
            Sign out
          </Button>
        </form>
      </section>
    </div>
  );
}
