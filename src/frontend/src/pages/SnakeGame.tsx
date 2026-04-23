import { GameCanvas } from "@/components/GameCanvas";
import { Button } from "@/components/ui/button";
import { useSubmitScore } from "@/hooks/useSubmitScore";
import { GAMES } from "@/types/game";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
const COLS = 24;
const ROWS = 24;
const CELL = 22;
const CANVAS_W = COLS * CELL;
const CANVAS_H = ROWS * CELL;
const TICK_MS = 150;

const MAGENTA = "oklch(0.72 0.28 340)";
const MAGENTA_GLOW = "oklch(0.72 0.28 340 / 0.7)";
const FOOD_COLOR = "oklch(0.88 0.22 60)";
const BG_COLOR = "oklch(0.1 0.015 265)";
const GRID_COLOR = "oklch(0.18 0.02 265)";

// ── Types ─────────────────────────────────────────────────────────────────────
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
interface Point {
  x: number;
  y: number;
}
type GamePhase = "idle" | "playing" | "dead";

// ── Helpers ───────────────────────────────────────────────────────────────────
function randomFood(snake: Point[]): Point {
  let pt: Point;
  do {
    pt = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some((s) => s.x === pt.x && s.y === pt.y));
  return pt;
}

function initialSnake(): Point[] {
  const cx = Math.floor(COLS / 2);
  const cy = Math.floor(ROWS / 2);
  return [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
}

const SNAKE_META = GAMES.find((g) => g.id === "Snake")!;

// ── Component ─────────────────────────────────────────────────────────────────
export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const submitScore = useSubmitScore();

  const snakeRef = useRef<Point[]>(initialSnake());
  const dirRef = useRef<Dir>("RIGHT");
  const nextDirRef = useRef<Dir>("RIGHT");
  const foodRef = useRef<Point>(randomFood(snakeRef.current));
  const scoreRef = useRef(0);
  const phaseRef = useRef<GamePhase>("idle");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<GamePhase>("idle");
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, CANVAS_H);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(CANVAS_W, y * CELL);
      ctx.stroke();
    }

    // Food
    const food = foodRef.current;
    const fx = food.x * CELL + CELL / 2;
    const fy = food.y * CELL + CELL / 2;
    ctx.shadowBlur = 14;
    ctx.shadowColor = FOOD_COLOR;
    ctx.fillStyle = FOOD_COLOR;
    ctx.beginPath();
    ctx.arc(fx, fy, CELL * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake body
    snakeRef.current.forEach((seg, i) => {
      const alpha =
        i === 0 ? 1 : Math.max(0.35, 1 - i / snakeRef.current.length);
      ctx.shadowBlur = i === 0 ? 18 : 0;
      ctx.shadowColor = MAGENTA_GLOW;
      ctx.fillStyle =
        i === 0 ? MAGENTA : `oklch(0.72 0.28 340 / ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Head eyes
    if (snakeRef.current.length > 0) {
      const head = snakeRef.current[0];
      const d = dirRef.current;
      const hx = head.x * CELL + CELL / 2;
      const hy = head.y * CELL + CELL / 2;
      ctx.fillStyle = BG_COLOR;
      if (d === "RIGHT" || d === "LEFT") {
        const ex = d === "RIGHT" ? hx + 3 : hx - 3;
        ctx.beginPath();
        ctx.arc(ex, hy - 5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex, hy + 5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const ey = d === "DOWN" ? hy + 3 : hy - 3;
        ctx.beginPath();
        ctx.arc(hx - 5, ey, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hx + 5, ey, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (phaseRef.current === "dead") {
      ctx.fillStyle = "oklch(0 0 0 / 0.55)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
  }, []);

  // ── End game ──────────────────────────────────────────────────────────────
  const endGame = useCallback(() => {
    phaseRef.current = "dead";
    setPhase("dead");
    if (tickRef.current) clearInterval(tickRef.current);
    draw();
  }, [draw]);

  // ── Tick ──────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    if (phaseRef.current !== "playing") return;

    const cur = dirRef.current;
    const next = nextDirRef.current;
    const reverse =
      (cur === "UP" && next === "DOWN") ||
      (cur === "DOWN" && next === "UP") ||
      (cur === "LEFT" && next === "RIGHT") ||
      (cur === "RIGHT" && next === "LEFT");
    if (!reverse) dirRef.current = next;

    const snake = snakeRef.current;
    const head = snake[0];
    const d = dirRef.current;
    const newHead: Point = {
      x: head.x + (d === "RIGHT" ? 1 : d === "LEFT" ? -1 : 0),
      y: head.y + (d === "DOWN" ? 1 : d === "UP" ? -1 : 0),
    };

    if (
      newHead.x < 0 ||
      newHead.x >= COLS ||
      newHead.y < 0 ||
      newHead.y >= ROWS
    ) {
      endGame();
      return;
    }
    if (snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      endGame();
      return;
    }

    const ate =
      newHead.x === foodRef.current.x && newHead.y === foodRef.current.y;
    const newSnake = [newHead, ...snake];
    if (!ate) {
      newSnake.pop();
    } else {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      foodRef.current = randomFood(newSnake);
    }
    snakeRef.current = newSnake;
    draw();
  }, [draw, endGame]);

  // ── Start ─────────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    snakeRef.current = initialSnake();
    dirRef.current = "RIGHT";
    nextDirRef.current = "RIGHT";
    scoreRef.current = 0;
    foodRef.current = randomFood(snakeRef.current);
    phaseRef.current = "playing";
    setScore(0);
    setPhase("playing");
    setSubmitted(false);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, TICK_MS);
    draw();
  }, [tick, draw]);

  // ── Save score ────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (submitted) return;
    submitScore.mutate({ gameName: "Snake", score: scoreRef.current });
    setSubmitted(true);
  }, [submitted, submitScore]);

  // ── Keyboard input ────────────────────────────────────────────────────────
  useEffect(() => {
    const DIR_MAP: Record<string, Dir> = {
      ArrowUp: "UP",
      w: "UP",
      W: "UP",
      ArrowDown: "DOWN",
      s: "DOWN",
      S: "DOWN",
      ArrowLeft: "LEFT",
      a: "LEFT",
      A: "LEFT",
      ArrowRight: "RIGHT",
      d: "RIGHT",
      D: "RIGHT",
    };

    const onKey = (e: KeyboardEvent) => {
      const dir = DIR_MAP[e.key];
      if (dir) {
        e.preventDefault();
        if (phaseRef.current === "idle" || phaseRef.current === "dead") {
          startGame();
        } else {
          nextDirRef.current = dir;
        }
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (phaseRef.current !== "playing") startGame();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startGame]);

  // ── Tick scheduler ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "playing") {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = setInterval(tick, TICK_MS);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, tick]);

  // ── Initial draw ──────────────────────────────────────────────────────────
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <GameCanvas game={SNAKE_META} score={score} isPlaying={phase === "playing"}>
      <div className="relative flex items-center justify-center">
        {/* Canvas with neon border */}
        <div
          className="relative border-2 border-glow-magenta glow-magenta"
          style={{ lineHeight: 0 }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            data-ocid="snake.canvas_target"
            style={{ display: "block" }}
          />
        </div>

        {/* Idle overlay */}
        {phase === "idle" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            data-ocid="snake.idle_panel"
          >
            <div className="text-center px-8 py-8 rounded-xl bg-card/90 border border-glow-magenta glow-magenta backdrop-blur-sm">
              <p className="text-6xl mb-3">🐍</p>
              <h1 className="arcade-title text-3xl text-glow-magenta mb-2">
                SNAKE
              </h1>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs">
                Eat food to grow. Avoid walls and your own tail.
              </p>
              <div className="flex flex-col items-center gap-3">
                <Button
                  onClick={startGame}
                  className="w-44 font-display font-bold uppercase tracking-widest transition-smooth"
                  data-ocid="snake.start_button"
                >
                  Start Game
                </Button>
                <p className="text-xs text-muted-foreground">
                  Arrow keys / WASD · Space to start
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Game-over overlay */}
        {phase === "dead" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            data-ocid="snake.game_over_panel"
          >
            <div className="text-center px-8 py-8 rounded-xl bg-card/95 border border-glow-magenta glow-magenta backdrop-blur-sm">
              <p className="text-5xl mb-2">💀</p>
              <h2 className="arcade-title text-2xl text-glow-magenta mb-1">
                GAME OVER
              </h2>
              <p className="text-muted-foreground text-xs uppercase tracking-widest mb-3">
                Final Score
              </p>
              <p
                className="font-mono text-5xl font-bold text-glow-magenta mb-6"
                data-ocid="snake.final_score"
              >
                {score.toLocaleString()}
              </p>

              <div className="flex flex-col gap-3 items-center">
                {!submitted ? (
                  <Button
                    onClick={handleSubmit}
                    className="w-48 font-display font-bold uppercase tracking-widest transition-smooth"
                    data-ocid="snake.submit_score_button"
                  >
                    Save Score
                  </Button>
                ) : (
                  <p
                    className="text-sm text-glow-magenta font-semibold"
                    data-ocid="snake.score_saved_state"
                  >
                    ✓ Score saved!
                  </p>
                )}
                <Button
                  onClick={startGame}
                  variant="outline"
                  className="w-48 border-glow-magenta font-display font-bold uppercase tracking-widest transition-smooth hover:bg-muted"
                  data-ocid="snake.replay_button"
                >
                  Play Again
                </Button>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors-fast underline underline-offset-2"
                  type="button"
                  onClick={() => navigate({ to: "/" })}
                  data-ocid="snake.return_to_hub_button"
                >
                  Return to Hub
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GameCanvas>
  );
}
