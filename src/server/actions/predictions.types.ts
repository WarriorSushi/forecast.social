export type SubmitPredictionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; probability: number };

export const INITIAL_SUBMIT_PREDICTION_STATE: SubmitPredictionState = {
  status: "idle",
};
