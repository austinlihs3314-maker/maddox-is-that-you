import ScoresLib "lib/scores";
import ScoresMixin "mixins/scores-api";

actor {
  let scores = ScoresLib.empty();
  include ScoresMixin(scores);
};
