// State + constants for the profile server actions. See auth.types.ts
// for why these aren't co-located with the actions.

export type OnboardingState = {
  error: string | null;
  username?: string;
  displayName?: string;
};

export const initialOnboardingState: OnboardingState = { error: null };

export type EditProfileState = {
  error: string | null;
  ok: boolean;
};

export const initialEditProfileState: EditProfileState = {
  error: null,
  ok: false,
};
