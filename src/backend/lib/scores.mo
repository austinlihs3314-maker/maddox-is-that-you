import Map "mo:core/Map";
import Types "../types/scores";

module {
  public type ScoresMap = Map.Map<Types.GameName, Nat>;

  public func empty() : ScoresMap {
    Map.empty<Types.GameName, Nat>()
  };

  public func getHighScore(scores : ScoresMap, gameName : Types.GameName) : Nat {
    switch (scores.get(gameName)) {
      case (?score) { score };
      case null { 0 };
    }
  };

  public func submitScore(scores : ScoresMap, gameName : Types.GameName, score : Nat) : Bool {
    let current = switch (scores.get(gameName)) {
      case (?s) { s };
      case null { 0 };
    };
    if (score > current) {
      scores.add(gameName, score);
      true
    } else {
      false
    }
  };

  public func getAllHighScores(scores : ScoresMap) : [(Types.GameName, Nat)] {
    scores.toArray()
  };
};
