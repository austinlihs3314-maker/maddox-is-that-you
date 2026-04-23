import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Home } from "lucide-react";
import type { ReactNode } from "react";
import type { GameMeta } from "../types/game";

interface GameCanvasProps {
  game: GameMeta;
  children: ReactNode;
  score?: number;
  isPlaying?: boolean;
}

export function GameCanvas({
  game,
  children,
  score,
  isPlaying,
}: GameCanvasProps) {
  const navigate = useNavigate();

  return (
    <div
      className="relative w-full h-screen flex flex-col bg-background overflow-hidden"
      data-ocid="game.canvas_target"
    >
      {/* Top HUD bar */}
      <div className="relative z-20 flex items-center justify-between px-4 py-2 bg-card border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground transition-colors-fast"
          onClick={() => navigate({ to: "/" })}
          data-ocid="game.back_button"
          aria-label="Return to hub"
        >
          <ArrowLeft className="w-4 h-4" />
          <Home className="w-4 h-4" />
          <span className="font-display text-sm font-semibold uppercase tracking-widest">
            Hub
          </span>
        </Button>

        <div className="flex items-center gap-3">
          <span className={`arcade-title text-sm ${game.accentClass}`}>
            {game.title}
          </span>
        </div>

        {score !== undefined && (
          <div
            className="flex items-center gap-2"
            data-ocid="game.score_display"
          >
            <span className="text-muted-foreground text-xs uppercase tracking-widest font-mono">
              Score
            </span>
            <span className={`font-mono font-bold text-lg ${game.accentClass}`}>
              {score.toLocaleString()}
            </span>
          </div>
        )}

        {score === undefined && <div className="w-24" />}
      </div>

      {/* Game area */}
      <div
        className={`relative flex-1 flex items-center justify-center scanline ${isPlaying ? "" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
