export type CreateMarketState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "success"; slug: string };

export const INITIAL_CREATE_MARKET_STATE: CreateMarketState = {
  status: "idle",
};
