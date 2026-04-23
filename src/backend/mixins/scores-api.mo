import Map "mo:core/Map";
import ScoresLib "../lib/scores";
import Types "../types/scores";

mixin (scores : ScoresLib.ScoresMap) {
  public query func getHighScore(gameName : Types.GameName) : async Nat {
    ScoresLib.getHighScore(scores, gameName)
  };

  public func submitScore(gameName : Types.GameName, score : Nat) : async Bool {
    ScoresLib.submitScore(scores, gameName, score)
  };

  public query func getAllHighScores() : async [(Types.GameName, Nat)] {
    ScoresLib.getAllHighScores(scores)
  };
};
