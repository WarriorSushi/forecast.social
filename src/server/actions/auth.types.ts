// State + constants for the auth server actions. Kept separate so the
// "use server" file in auth.ts can export only async functions (Next.js
// constraint).

export type AuthState = {
  error: string | null;
  /** Persisted across re-renders so the form input stays populated. */
  email?: string;
  /** Positive flash message — e.g. "Confirmation email resent." */
  message?: string;
};

export const initialAuthState: AuthState = { error: null };
