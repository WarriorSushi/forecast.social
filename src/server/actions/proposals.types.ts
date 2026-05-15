export type ProposeMarketState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "success"; proposalId: string };

export const INITIAL_PROPOSE_MARKET_STATE: ProposeMarketState = {
  status: "idle",
};
