export type SubmitPredictionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      probability: number;
      predictionId: string;
      inviteUnlocked: boolean;
      inviteCredits: number;
      foundingMemberNumber: number | null;
    };

export const INITIAL_SUBMIT_PREDICTION_STATE: SubmitPredictionState = {
  status: "idle",
};
