import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas } from "../components/GameCanvas";
import { useSubmitScore } from "../hooks/useSubmitScore";
import { GAMES } from "../types/game";

const game = GAMES.find((g) => g.id === "FlappyBird")!;

// ─── Constants ───────────────────────────────────────────────────────────────
const CANVAS_W = 480;
const CANVAS_H = 640;

const GRAVITY = 0.5;
const FLAP_FORCE = -10;
const PIPE_SPEED = 2.8;
const PIPE_WIDTH = 64;
const PIPE_GAP = 160;
const PIPE_INTERVAL = 120; // frames between new pipes

const BIRD_X = 100;
const BIRD_R = 18; // radius for collision
const BIRD_DRAW_W = 38;
const BIRD_DRAW_H = 28;

// Neon purple palette
const C_BG_TOP = "oklch(0.1 0.025 295)";
const C_BG_BOT = "oklch(0.16 0.04 295)";
const C_PIPE = "oklch(0.55 0.22 295)";
const C_PIPE_BORDER = "oklch(0.72 0.28 295)";
const C_BIRD_FILL = "oklch(0.85 0.2 295)";
const C_BIRD_EYE = "oklch(0.08 0 0)";
const C_BIRD_BEAK = "oklch(0.82 0.18 60)";
const C_SCORE = "oklch(0.9 0.2 295)";
const C_GROUND = "oklch(0.22 0.04 295)";
const C_GLOW = "oklch(0.72 0.28 295 / 0.55)";
const GROUND_H = 48;

// ─── Types ────────────────────────────────────────────────────────────────────
type GamePhase = "idle" | "playing" | "dead";

interface Pipe {
  x: number;
  gapY: number; // center of gap
  scored: boolean;
}

interface BirdState {
  y: number;
  vy: number;
  angle: number; // visual tilt in radians
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, C_BG_TOP);
  grad.addColorStop(1, C_BG_BOT);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // subtle star dots
  ctx.fillStyle = "oklch(0.9 0.05 295 / 0.4)";
  const stars = [
    [40, 60],
    [120, 30],
    [200, 80],
    [310, 20],
    [380, 90],
    [440, 45],
    [60, 140],
    [290, 160],
    [170, 180],
  ];
  for (const [sx, sy] of stars) {
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C_GROUND;
  ctx.fillRect(0, CANVAS_H - GROUND_H, CANVAS_W, GROUND_H);
  ctx.strokeStyle = C_PIPE_BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_H - GROUND_H);
  ctx.lineTo(CANVAS_W, CANVAS_H - GROUND_H);
  ctx.stroke();
  // grass tufts
  ctx.strokeStyle = "oklch(0.55 0.18 145 / 0.7)";
  ctx.lineWidth = 2;
  for (let i = 12; i < CANVAS_W; i += 22) {
    ctx.beginPath();
    ctx.moveTo(i, CANVAS_H - GROUND_H);
    ctx.lineTo(i - 4, CANVAS_H - GROUND_H - 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i, CANVAS_H - GROUND_H);
    ctx.lineTo(i + 4, CANVAS_H - GROUND_H - 8);
    ctx.stroke();
  }
}

function drawPipe(ctx: CanvasRenderingContext2D, x: number, gapY: number) {
  const halfGap = PIPE_GAP / 2;
  const topH = gapY - halfGap;
  const botY = gapY + halfGap;
  const botH = CANVAS_H - GROUND_H - botY;

  // glow
  ctx.shadowColor = C_GLOW;
  ctx.shadowBlur = 16;

  // top pipe
  ctx.fillStyle = C_PIPE;
  ctx.fillRect(x, 0, PIPE_WIDTH, topH);
  ctx.strokeStyle = C_PIPE_BORDER;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, 0, PIPE_WIDTH, topH);

  // top pipe cap
  ctx.fillStyle = C_PIPE_BORDER;
  ctx.fillRect(x - 4, topH - 20, PIPE_WIDTH + 8, 20);
  ctx.strokeRect(x - 4, topH - 20, PIPE_WIDTH + 8, 20);

  // bottom pipe
  ctx.fillStyle = C_PIPE;
  ctx.fillRect(x, botY, PIPE_WIDTH, botH);
  ctx.strokeStyle = C_PIPE_BORDER;
  ctx.strokeRect(x, botY, PIPE_WIDTH, botH);

  // bottom pipe cap
  ctx.fillStyle = C_PIPE_BORDER;
  ctx.fillRect(x - 4, botY, PIPE_WIDTH + 8, 20);
  ctx.strokeRect(x - 4, botY, PIPE_WIDTH + 8, 20);

  ctx.shadowBlur = 0;
}

function drawBird(
  ctx: CanvasRenderingContext2D,
  y: number,
  angle: number,
  frame: number,
) {
  ctx.save();
  ctx.translate(BIRD_X, y);
  ctx.rotate(angle);

  // wing flap offset
  const wingY = Math.sin(frame * 0.4) * 5;

  // glow
  ctx.shadowColor = C_GLOW;
  ctx.shadowBlur = 20;

  // body
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_DRAW_W / 2, BIRD_DRAW_H / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = C_BIRD_FILL;
  ctx.fill();

  // wing
  ctx.beginPath();
  ctx.ellipse(-4, wingY, 12, 7, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "oklch(0.72 0.25 295)";
  ctx.fill();

  ctx.shadowBlur = 0;

  // eye
  ctx.beginPath();
  ctx.arc(8, -4, 5, 0, Math.PI * 2);
  ctx.fillStyle = "oklch(0.98 0 0)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(9, -4, 3, 0, Math.PI * 2);
  ctx.fillStyle = C_BIRD_EYE;
  ctx.fill();

  // beak
  ctx.beginPath();
  ctx.moveTo(14, 2);
  ctx.lineTo(22, -1);
  ctx.lineTo(14, 5);
  ctx.closePath();
  ctx.fillStyle = C_BIRD_BEAK;
  ctx.fill();

  ctx.restore();
}

function drawScore(ctx: CanvasRenderingContext2D, score: number) {
  ctx.font = "bold 42px monospace";
  ctx.textAlign = "center";
  ctx.shadowColor = C_GLOW;
  ctx.shadowBlur = 18;
  ctx.fillStyle = C_SCORE;
  ctx.fillText(String(score), CANVAS_W / 2, 70);
  ctx.shadowBlur = 0;
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  phase: GamePhase,
  score: number,
  highScore: number,
) {
  // dim background
  ctx.fillStyle = "oklch(0 0 0 / 0.55)";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (phase === "idle") {
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = C_SCORE;
    ctx.shadowColor = C_GLOW;
    ctx.shadowBlur = 20;
    ctx.fillText("FLAPPY BIRD", CANVAS_W / 2, CANVAS_H / 2 - 60);
    ctx.shadowBlur = 0;

    ctx.font = "18px monospace";
    ctx.fillStyle = "oklch(0.8 0.1 295)";
    ctx.fillText("Click or SPACE to start", CANVAS_W / 2, CANVAS_H / 2 - 10);

    if (highScore > 0) {
      ctx.font = "14px monospace";
      ctx.fillStyle = "oklch(0.65 0.15 295)";
      ctx.fillText(`Best: ${highScore}`, CANVAS_W / 2, CANVAS_H / 2 + 25);
    }
  } else if (phase === "dead") {
    ctx.font = "bold 40px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "oklch(0.75 0.25 22)";
    ctx.shadowColor = "oklch(0.65 0.22 22 / 0.7)";
    ctx.shadowBlur = 20;
    ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 70);
    ctx.shadowBlur = 0;

    ctx.font = "bold 28px monospace";
    ctx.fillStyle = C_SCORE;
    ctx.fillText(`Score: ${score}`, CANVAS_W / 2, CANVAS_H / 2 - 20);

    if (highScore > 0) {
      ctx.font = "18px monospace";
      ctx.fillStyle = "oklch(0.72 0.2 295)";
      ctx.fillText(`Best: ${highScore}`, CANVAS_W / 2, CANVAS_H / 2 + 20);
    }

    ctx.font = "16px monospace";
    ctx.fillStyle = "oklch(0.75 0.1 295)";
    ctx.fillText(
      "Press SPACE or click to replay",
      CANVAS_W / 2,
      CANVAS_H / 2 + 60,
    );
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FlappyBird() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const submitScore = useSubmitScore();

  // React state for HUD and overlay
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Game state in refs (mutable, no re-render needed per frame)
  const phaseRef = useRef<GamePhase>("idle");
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);
  const frameRef = useRef(0);
  const frameCountRef = useRef(0);
  const pipeTimerRef = useRef(0);

  const birdRef = useRef<BirdState>({ y: CANVAS_H / 2, vy: 0, angle: 0 });
  const pipesRef = useRef<Pipe[]>([]);

  const syncHighScore = useCallback(() => {
    const stored = localStorage.getItem("arcade_highscores");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<string, number>;
        const hs = parsed.FlappyBird ?? 0;
        highScoreRef.current = hs;
        setHighScore(hs);
      } catch {
        // ignore
      }
    }
  }, []);

  const resetGame = useCallback(() => {
    birdRef.current = { y: CANVAS_H / 2, vy: 0, angle: 0 };
    pipesRef.current = [];
    scoreRef.current = 0;
    pipeTimerRef.current = 0;
    frameCountRef.current = 0;
    setScore(0);
  }, []);

  const flap = useCallback(() => {
    if (phaseRef.current === "dead") {
      // restart
      resetGame();
      phaseRef.current = "playing";
      setPhase("playing");
      return;
    }
    if (phaseRef.current === "idle") {
      phaseRef.current = "playing";
      setPhase("playing");
    }
    birdRef.current.vy = FLAP_FORCE;
  }, [resetGame]);

  const endGame = useCallback(() => {
    phaseRef.current = "dead";
    setPhase("dead");

    const finalScore = scoreRef.current;
    submitScore.mutate(
      { gameName: "FlappyBird", score: finalScore },
      {
        onSuccess: (updated) => {
          const hs = updated.FlappyBird ?? 0;
          highScoreRef.current = hs;
          setHighScore(hs);
        },
      },
    );
  }, [submitScore]);

  // ─── Game loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    syncHighScore();

    function loop() {
      if (!ctx) return;
      frameCountRef.current++;
      const fc = frameCountRef.current;

      // ── Update ──────────────────────────────────────────────────────────
      if (phaseRef.current === "playing") {
        const bird = birdRef.current;

        // physics
        bird.vy += GRAVITY;
        bird.y += bird.vy;
        bird.angle = Math.min(
          Math.PI / 4,
          Math.max(-Math.PI / 4, bird.vy * 0.065),
        );

        // spawn pipes
        pipeTimerRef.current++;
        if (pipeTimerRef.current >= PIPE_INTERVAL) {
          pipeTimerRef.current = 0;
          const minGapY = PIPE_GAP / 2 + 40;
          const maxGapY = CANVAS_H - GROUND_H - PIPE_GAP / 2 - 40;
          const gapY = minGapY + Math.random() * (maxGapY - minGapY);
          pipesRef.current.push({
            x: CANVAS_W + PIPE_WIDTH,
            gapY,
            scored: false,
          });
        }

        // move pipes + scoring
        pipesRef.current = pipesRef.current.filter(
          (p) => p.x > -PIPE_WIDTH - 20,
        );
        for (const p of pipesRef.current) {
          p.x -= PIPE_SPEED;
          if (!p.scored && p.x + PIPE_WIDTH < BIRD_X - BIRD_R) {
            p.scored = true;
            scoreRef.current += 10;
            setScore(scoreRef.current);
          }
        }

        // ── Collision ──────────────────────────────────────────────────
        // ground / ceiling
        if (bird.y + BIRD_R >= CANVAS_H - GROUND_H || bird.y - BIRD_R <= 0) {
          endGame();
        }

        // pipes
        for (const p of pipesRef.current) {
          const halfGap = PIPE_GAP / 2;
          const birdLeft = BIRD_X - BIRD_R + 6;
          const birdRight = BIRD_X + BIRD_R - 6;
          const birdTop = bird.y - BIRD_R + 6;
          const birdBot = bird.y + BIRD_R - 6;

          const inXRange =
            birdRight > p.x + 4 && birdLeft < p.x + PIPE_WIDTH - 4;
          if (inXRange) {
            if (birdTop < p.gapY - halfGap || birdBot > p.gapY + halfGap) {
              endGame();
              break;
            }
          }
        }
      }

      // ── Draw ────────────────────────────────────────────────────────────
      drawBackground(ctx);

      for (const p of pipesRef.current) {
        drawPipe(ctx, p.x, p.gapY);
      }

      drawGround(ctx);

      if (phaseRef.current !== "idle") {
        drawBird(ctx, birdRef.current.y, birdRef.current.angle, fc);
      }

      if (phaseRef.current === "playing") {
        drawScore(ctx, scoreRef.current);
      }

      if (phaseRef.current !== "playing") {
        drawOverlay(
          ctx,
          phaseRef.current,
          scoreRef.current,
          highScoreRef.current,
        );
      }

      frameRef.current = requestAnimationFrame(loop);
    }

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [syncHighScore, endGame]);

  // ─── Input ────────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap]);

  return (
    <GameCanvas game={game} score={score} isPlaying={phase === "playing"}>
      <div className="relative flex items-center justify-center w-full h-full">
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="max-h-full max-w-full object-contain cursor-pointer select-none rounded-lg"
          style={{ imageRendering: "pixelated" }}
          onClick={flap}
          onKeyDown={(e) => {
            if (e.code === "Space") flap();
          }}
          aria-label="Flappy Bird game canvas"
          data-ocid="flappy.canvas_target"
        />

        {/* Game-over action buttons (HTML overlay for accessibility) */}
        {phase === "dead" && (
          <div
            className="absolute bottom-8 flex gap-4"
            data-ocid="flappy.gameover.panel"
          >
            <button
              type="button"
              className="px-5 py-2 rounded-lg font-mono font-bold text-sm border transition-colors-fast
                bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:border-foreground"
              onClick={() => navigate({ to: "/" })}
              data-ocid="flappy.hub_button"
            >
              ← Hub
            </button>
            <button
              type="button"
              className="px-5 py-2 rounded-lg font-mono font-bold text-sm border transition-colors-fast
                text-glow-purple border-glow-purple bg-muted/20 hover:bg-muted/40"
              onClick={flap}
              data-ocid="flappy.replay_button"
            >
              Play Again
            </button>
          </div>
        )}

        {/* High score badge shown while playing */}
        {phase === "playing" && highScore > 0 && (
          <div
            className="absolute top-3 left-3 font-mono text-xs text-muted-foreground bg-card/60 px-2 py-1 rounded"
            data-ocid="flappy.highscore_badge"
          >
            Best: {highScore}
          </div>
        )}
      </div>
    </GameCanvas>
  );
}
