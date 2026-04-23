import { useQuery } from "@tanstack/react-query";
import { type HighScores, loadLocalHighScores } from "../types/game";

/**
 * Fetches all-time high scores.
 * Falls back to localStorage since backend bindgen may not expose these methods yet.
 */
export function useHighScores() {
  return useQuery<HighScores>({
    queryKey: ["highScores"],
    queryFn: async () => {
      return loadLocalHighScores();
    },
    staleTime: 5_000,
  });
}
