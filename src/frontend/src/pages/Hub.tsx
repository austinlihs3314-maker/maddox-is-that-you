import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { Trophy, Zap } from "lucide-react";
import { useHighScores } from "../hooks/useHighScores";
import { GAMES, type GameMeta } from "../types/game";

function GameTile({
  game,
  highScore,
  index,
}: { game: GameMeta; highScore: number; index: number }) {
  const navigate = useNavigate();
  const delay = `${index * 80}ms`;

  const handlePlay = () => navigate({ to: game.route });

  return (
    <div
      className={[
        "relative flex flex-col overflow-hidden rounded-xl border-2 bg-card",
        "game-card-hover",
        game.borderGlowClass,
        game.glowClass,
        "animate-slide-in-up",
      ].join(" ")}
      style={{ animationDelay: delay }}
      data-ocid={`hub.game_card.${index + 1}`}
    >
      {/* Card header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2
            className={`arcade-title text-2xl leading-tight ${game.accentClass}`}
          >
            {game.title}
          </h2>
          <span
            className="text-3xl select-none flex-shrink-0 animate-float"
            style={{ animationDelay: `${index * 0.5}s` }}
          >
            {game.emoji}
          </span>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {game.description}
        </p>
      </div>

      {/* Score row */}
      <div className="flex items-center gap-3 px-5 py-3 bg-muted/20 border-t border-border">
        <Trophy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-muted-foreground text-xs uppercase tracking-widest font-mono">
            Best
          </span>
          <p
            className={`font-mono font-bold text-xl ${game.accentClass} truncate`}
          >
            {highScore > 0 ? highScore.toLocaleString() : "—"}
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-xs font-mono shrink-0 border-border text-muted-foreground"
        >
          {game.controls.split("•")[0].trim()}
        </Badge>
      </div>

      {/* Play CTA */}
      <div className="px-5 py-4">
        <Button
          className="w-full arcade-title text-sm font-black tracking-widest"
          onClick={handlePlay}
          data-ocid={`hub.play_button.${index + 1}`}
        >
          <Zap className="w-4 h-4 mr-2" />
          Play Now
        </Button>
      </div>
    </div>
  );
}

export default function Hub() {
  const { data: highScores, isLoading } = useHighScores();

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      data-ocid="hub.page"
    >
      {/* Hero heading */}
      <div className="text-center mb-10 animate-slide-in-up">
        <h1 className="arcade-title text-4xl sm:text-5xl font-black text-foreground mb-3 animate-neon-flicker">
          Maddox Is That You?
        </h1>
        <p className="text-muted-foreground text-base max-w-xl mx-auto font-body">
          Four games. Zero downloads. Unblocked. Pick your game and go.
        </p>
      </div>

      {/* Hero image banner */}
      <div className="rounded-2xl overflow-hidden mb-10 border border-border">
        <img
          src="/assets/generated/hub-hero.dim_1200x400.jpg"
          alt="Maddox Arcade Hub — Golf Orbit, Space Shooter, Snake, Flappy Bird"
          className="w-full object-cover h-40 sm:h-56"
        />
      </div>

      {/* High scores banner */}
      <div
        className="flex flex-wrap items-center justify-center gap-4 mb-10 px-5 py-3 rounded-xl bg-card border border-border"
        data-ocid="hub.scores_banner"
      >
        <Trophy className="w-5 h-5 text-primary shrink-0" />
        <span className="font-display font-bold text-sm uppercase tracking-widest text-muted-foreground">
          All-Time High Scores
        </span>
        {isLoading
          ? GAMES.map((g) => (
              <Skeleton key={g.id} className="h-5 w-24 rounded" />
            ))
          : GAMES.map((g) => (
              <div key={g.id} className="flex items-center gap-1.5">
                <span
                  className={`text-xs font-mono font-bold uppercase ${g.accentClass}`}
                >
                  {g.title.split(" ")[0]}:
                </span>
                <span className="font-mono text-xs text-foreground font-bold">
                  {highScores?.[g.id] ? highScores[g.id].toLocaleString() : "—"}
                </span>
              </div>
            ))}
      </div>

      {/* Game grid 2×2 */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-6"
        data-ocid="hub.games_grid"
      >
        {GAMES.map((game, i) => (
          <GameTile
            key={game.id}
            game={game}
            highScore={highScores?.[game.id] ?? 0}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
