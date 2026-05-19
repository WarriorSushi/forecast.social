"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile } from "@/server/actions/profile";
import { initialEditProfileState } from "@/server/actions/profile.types";

type Props = {
  defaultDisplayName: string;
  defaultBio: string;
};

export function EditProfileForm({
  defaultDisplayName,
  defaultBio,
}: Props) {
  const [state, formAction] = useActionState(
    updateProfile,
    initialEditProfileState,
  );

  // Surface success/failure via toast so the user gets immediate feedback.
  useEffect(() => {
    if (state.ok) toast.success("Profile saved.");
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName" className="text-overline text-muted-foreground">
          Display name
        </Label>
        <Input
          id="displayName"
          name="displayName"
          type="text"
          required
          maxLength={40}
          defaultValue={defaultDisplayName}
          className="h-11"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bio" className="text-overline text-muted-foreground">
          Bio
        </Label>
        <Textarea
          id="bio"
          name="bio"
          maxLength={280}
          rows={3}
          defaultValue={defaultBio}
          placeholder="A line about your forecasting beat. Optional."
        />
        <p className="text-caption text-muted-foreground">
          Up to 280 characters.
        </p>
      </div>

      <SaveButton />
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="self-start">
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}
