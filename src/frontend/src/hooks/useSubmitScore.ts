import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type GameName,
  type HighScores,
  saveLocalHighScore,
} from "../types/game";

interface SubmitScoreArgs {
  gameName: GameName;
  score: number;
}

/**
 * Submits a score for a game and refreshes the high scores cache.
 * Persists to localStorage and invalidates the highScores query.
 */
export function useSubmitScore() {
  const queryClient = useQueryClient();

  return useMutation<HighScores, Error, SubmitScoreArgs>({
    mutationFn: async ({ gameName, score }) => {
      return saveLocalHighScore(gameName, score);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<HighScores>(["highScores"], updated);
    },
  });
}
