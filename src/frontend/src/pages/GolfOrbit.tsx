import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas } from "../components/GameCanvas";
import { useSubmitScore } from "../hooks/useSubmitScore";
import { GAMES } from "../types/game";

// ── Constants ──────────────────────────────────────────────────────────────
const GAME_META = GAMES.find((g) => g.id === "GolfOrbit")!;
const MAX_SHOTS = 5;
const CANVAS_W = 700;
const CANVAS_H = 500;
const GRAVITY = 0.22;
const BOUNCE_DAMPING = 0.62;
const BALL_RADIUS = 9;
const GOAL_RADIUS = 22;
const GOLD = "oklch(0.82 0.18 80)";
const GOLD_DIM = "oklch(0.62 0.14 80)";
const GOLD_GLOW = "oklch(0.82 0.18 80 / 0.45)";
const DARK_BG = "oklch(0.1 0.015 265)";
const CARD_BG = "oklch(0.14 0.02 265)";
const ORIGIN_X = 80;
const ORIGIN_Y = 410;

type Phase = "aiming" | "flying" | "won" | "lost";

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  trail: { x: number; y: number }[];
}

interface Hole {
  x: number;
  y: number;
}

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

function makeHole(level: number): Hole {
  const positions: Hole[] = [
    { x: 540, y: 250 },
    { x: 490, y: 150 },
    { x: 580, y: 370 },
    { x: 440, y: 300 },
    { x: 560, y: 190 },
  ];
  return positions[(level - 1) % positions.length];
}

function makeObstacles(level: number): Obstacle[] {
  if (level === 1) return [{ x: 300, y: 190, w: 18, h: 140 }];
  if (level === 2)
    return [
      { x: 280, y: 90, w: 140, h: 18 },
      { x: 420, y: 270, w: 18, h: 130 },
    ];
  return [
    { x: 230, y: 140, w: 18, h: 120 },
    { x: 390, y: 240, w: 120, h: 18 },
    { x: 500, y: 110, w: 18, h: 100 },
  ];
}

function launchBall(angleDeg: number, power: number): Ball {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const speed = (power / 100) * 18;
  return {
    x: ORIGIN_X,
    y: ORIGIN_Y,
    vx: Math.cos(rad) * speed,
    vy: Math.sin(rad) * speed,
    active: true,
    trail: [],
  };
}

function rectCollide(
  bx: number,
  by: number,
  obs: Obstacle,
): { hit: boolean; nx: number; ny: number } {
  const cx = Math.max(obs.x, Math.min(bx, obs.x + obs.w));
  const cy = Math.max(obs.y, Math.min(by, obs.y + obs.h));
  const dx = bx - cx;
  const dy = by - cy;
  if (Math.sqrt(dx * dx + dy * dy) >= BALL_RADIUS)
    return { hit: false, nx: 0, ny: 0 };
  const overlapX = Math.min(
    Math.abs(bx - obs.x),
    Math.abs(bx - (obs.x + obs.w)),
  );
  const overlapY = Math.min(
    Math.abs(by - obs.y),
    Math.abs(by - (obs.y + obs.h)),
  );
  return {
    hit: true,
    nx: overlapX < overlapY ? (bx < obs.x + obs.w / 2 ? -1 : 1) : 0,
    ny: overlapY <= overlapX ? (by < obs.y + obs.h / 2 ? -1 : 1) : 0,
  };
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  ball: Ball | null,
  hole: Hole,
  obstacles: Obstacle[],
) {
  ctx.fillStyle = DARK_BG;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Grid
  ctx.strokeStyle = "oklch(0.2 0.02 265)";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < CANVAS_W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }
  for (let y = 0; y < CANVAS_H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }

  // Canvas border
  ctx.strokeStyle = GOLD_DIM;
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, CANVAS_W - 4, CANVAS_H - 4);

  // Obstacles
  for (const obs of obstacles) {
    ctx.fillStyle = "oklch(0.22 0.03 265)";
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    ctx.strokeStyle = "oklch(0.42 0.06 265)";
    ctx.lineWidth = 1;
    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
  }

  // Goal glow halo
  const halo = ctx.createRadialGradient(
    hole.x,
    hole.y,
    GOAL_RADIUS * 0.4,
    hole.x,
    hole.y,
    GOAL_RADIUS * 1.8,
  );
  halo.addColorStop(0, "oklch(0.82 0.18 80 / 0.2)");
  halo.addColorStop(1, "oklch(0.82 0.18 80 / 0)");
  ctx.beginPath();
  ctx.arc(hole.x, hole.y, GOAL_RADIUS * 1.8, 0, Math.PI * 2);
  ctx.fillStyle = halo;
  ctx.fill();

  // Goal ring
  ctx.beginPath();
  ctx.arc(hole.x, hole.y, GOAL_RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.shadowColor = GOLD_GLOW;
  ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Flag pole + flag
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hole.x, hole.y - GOAL_RADIUS + 2);
  ctx.lineTo(hole.x, hole.y + GOAL_RADIUS - 4);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.shadowColor = GOLD_GLOW;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(hole.x, hole.y - GOAL_RADIUS + 2);
  ctx.lineTo(hole.x + 16, hole.y - GOAL_RADIUS - 8);
  ctx.lineTo(hole.x, hole.y - GOAL_RADIUS - 6);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Tee marker
  ctx.beginPath();
  ctx.arc(ORIGIN_X, ORIGIN_Y, BALL_RADIUS + 4, 0, Math.PI * 2);
  ctx.strokeStyle = "oklch(0.5 0.06 265)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Trail
  if (ball?.trail && ball.trail.length > 1) {
    for (let i = 1; i < ball.trail.length; i++) {
      const alpha = i / ball.trail.length;
      ctx.beginPath();
      ctx.arc(
        ball.trail[i].x,
        ball.trail[i].y,
        BALL_RADIUS * 0.45 * alpha,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = `oklch(0.82 0.18 80 / ${alpha * 0.5})`;
      ctx.fill();
    }
  }

  // Ball
  if (ball?.active) {
    const bg = ctx.createRadialGradient(
      ball.x - 3,
      ball.y - 3,
      1,
      ball.x,
      ball.y,
      BALL_RADIUS,
    );
    bg.addColorStop(0, "oklch(0.97 0.06 80)");
    bg.addColorStop(0.6, GOLD);
    bg.addColorStop(1, "oklch(0.55 0.16 80)");
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.shadowColor = GOLD_GLOW;
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function GolfOrbit() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef<Ball | null>(null);
  const phaseRef = useRef<Phase>("aiming");
  const rafRef = useRef<number>(0);
  const holeRef = useRef<Hole>(makeHole(1));
  const obstaclesRef = useRef<Obstacle[]>(makeObstacles(1));
  const shotsLeftRef = useRef(MAX_SHOTS);

  const [phase, setPhase] = useState<Phase>("aiming");
  const [shotsLeft, setShotsLeft] = useState(MAX_SHOTS);
  const [score, setScore] = useState(0);
  const [angle, setAngle] = useState(45);
  const [power, setPower] = useState(60);
  const [level, setLevel] = useState(1);

  const submitScore = useSubmitScore();

  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ball = ballRef.current;
    const hole = holeRef.current;
    const obstacles = obstaclesRef.current;

    if (phaseRef.current === "flying" && ball?.active) {
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 24) ball.trail.shift();

      ball.vy += GRAVITY;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall bounces
      if (ball.x - BALL_RADIUS < 0) {
        ball.x = BALL_RADIUS;
        ball.vx = Math.abs(ball.vx) * BOUNCE_DAMPING;
      }
      if (ball.x + BALL_RADIUS > CANVAS_W) {
        ball.x = CANVAS_W - BALL_RADIUS;
        ball.vx = -Math.abs(ball.vx) * BOUNCE_DAMPING;
      }
      if (ball.y - BALL_RADIUS < 0) {
        ball.y = BALL_RADIUS;
        ball.vy = Math.abs(ball.vy) * BOUNCE_DAMPING;
      }
      if (ball.y + BALL_RADIUS > CANVAS_H) {
        ball.y = CANVAS_H - BALL_RADIUS;
        ball.vy = -Math.abs(ball.vy) * BOUNCE_DAMPING;
        ball.vx *= BOUNCE_DAMPING;
      }

      // Obstacle collisions
      for (const obs of obstacles) {
        const { hit, nx, ny } = rectCollide(ball.x, ball.y, obs);
        if (hit) {
          if (nx !== 0) {
            ball.vx = nx * Math.abs(ball.vx) * BOUNCE_DAMPING;
            ball.x += nx * (BALL_RADIUS + 1);
          }
          if (ny !== 0) {
            ball.vy = ny * Math.abs(ball.vy) * BOUNCE_DAMPING;
            ball.y += ny * (BALL_RADIUS + 1);
          }
        }
      }

      // Goal check
      const dx = ball.x - hole.x;
      const dy = ball.y - hole.y;
      if (Math.sqrt(dx * dx + dy * dy) < GOAL_RADIUS) {
        ball.active = false;
        const finalScore = shotsLeftRef.current * 20;
        phaseRef.current = "won";
        setScore(finalScore);
        setPhase("won");
        submitScore.mutate({ gameName: "GolfOrbit", score: finalScore });
        drawScene(ctx, ball, hole, obstacles);
        return;
      }

      // Ball stopped on floor
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (speed < 0.4 && ball.y + BALL_RADIUS >= CANVAS_H - 1) {
        ball.active = false;
        const remaining = shotsLeftRef.current;
        if (remaining <= 0) {
          phaseRef.current = "lost";
          setPhase("lost");
        } else {
          phaseRef.current = "aiming";
          setPhase("aiming");
        }
        drawScene(ctx, ball, hole, obstacles);
        return;
      }
    }

    drawScene(ctx, ball, hole, obstacles);

    if (phaseRef.current === "flying") {
      rafRef.current = requestAnimationFrame(renderLoop);
    }
  }, [submitScore]);

  useEffect(() => {
    if (phase === "flying") {
      rafRef.current = requestAnimationFrame(renderLoop);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, renderLoop]);

  // Draw static on non-flying phases
  useEffect(() => {
    if (phase !== "flying") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      drawScene(ctx, ballRef.current, holeRef.current, obstaclesRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const shoot = () => {
    if (phase !== "aiming" || shotsLeft <= 0) return;
    const ball = launchBall(angle, power);
    ballRef.current = ball;
    const next = shotsLeft - 1;
    shotsLeftRef.current = next;
    setShotsLeft(next);
    phaseRef.current = "flying";
    setPhase("flying");
  };

  const startLevel = (lv: number) => {
    cancelAnimationFrame(rafRef.current);
    holeRef.current = makeHole(lv);
    obstaclesRef.current = makeObstacles(lv);
    ballRef.current = null;
    shotsLeftRef.current = MAX_SHOTS;
    phaseRef.current = "aiming";
    setLevel(lv);
    setShotsLeft(MAX_SHOTS);
    setScore(0);
    setPhase("aiming");
  };

  const shotsUsed = MAX_SHOTS - shotsLeft;

  return (
    <GameCanvas game={GAME_META} score={score} isPlaying={phase === "flying"}>
      <div className="relative flex flex-col items-center gap-4 w-full h-full justify-center py-4">
        {/* Canvas */}
        <div
          className="relative border-2 border-glow-gold rounded-lg overflow-hidden glow-gold"
          style={{ width: CANVAS_W, height: CANVAS_H, flexShrink: 0 }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="block"
            data-ocid="golf.canvas_target"
          />

          {/* Shot pips */}
          {(phase === "aiming" || phase === "flying") && (
            <div
              className="absolute top-3 left-3 flex gap-1.5"
              data-ocid="golf.shots_counter"
            >
              {([0, 1, 2, 3, 4] as const).map((i) => (
                <div
                  key={`pip-${i}`}
                  className="w-3 h-3 rounded-full border"
                  style={{
                    borderColor: GOLD,
                    background: i < shotsUsed ? GOLD : "transparent",
                    boxShadow: i < shotsUsed ? `0 0 6px ${GOLD}` : "none",
                  }}
                />
              ))}
            </div>
          )}

          {/* Level badge */}
          <div
            className="absolute top-3 right-3 font-mono text-xs text-glow-gold opacity-80"
            data-ocid="golf.level_badge"
          >
            LVL {level}
          </div>

          {/* Win overlay */}
          {phase === "won" && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              style={{ background: "oklch(0.08 0.01 265 / 0.85)" }}
              data-ocid="golf.win_panel"
            >
              <p className="arcade-title text-glow-gold text-5xl">Hole In!</p>
              <p className="font-mono text-foreground text-xl">
                Score:{" "}
                <span className="text-glow-gold font-bold text-2xl">
                  {score}
                </span>
              </p>
              <p className="text-muted-foreground text-sm font-mono">
                {shotsLeft} shot{shotsLeft !== 1 ? "s" : ""} remaining × 20
              </p>
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-md border-2 border-glow-gold text-glow-gold arcade-title text-sm hover:bg-[oklch(0.82_0.18_80/0.14)] active:scale-95 transition-colors-fast"
                  onClick={() => startLevel(level + 1)}
                  data-ocid="golf.next_level_button"
                >
                  Next Level →
                </button>
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-md border border-border text-muted-foreground arcade-title text-sm hover:bg-card active:scale-95 transition-colors-fast"
                  onClick={() => startLevel(1)}
                  data-ocid="golf.restart_button"
                >
                  Restart
                </button>
              </div>
            </div>
          )}

          {/* Lose overlay */}
          {phase === "lost" && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              style={{ background: "oklch(0.08 0.01 265 / 0.85)" }}
              data-ocid="golf.lose_panel"
            >
              <p
                className="arcade-title text-5xl"
                style={{
                  color: "oklch(0.65 0.22 22)",
                  textShadow: "0 0 14px oklch(0.65 0.22 22 / 0.55)",
                }}
              >
                Out of Shots
              </p>
              <p className="font-mono text-muted-foreground text-sm">
                The ball didn&apos;t reach the hole
              </p>
              <button
                type="button"
                className="mt-1 px-7 py-2.5 rounded-md border-2 border-glow-gold text-glow-gold arcade-title text-sm hover:bg-[oklch(0.82_0.18_80/0.14)] active:scale-95 transition-colors-fast"
                onClick={() => startLevel(level)}
                data-ocid="golf.retry_button"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Controls panel */}
        {phase === "aiming" && (
          <div
            className="flex items-end gap-6 px-6 py-4 rounded-xl border-2 border-glow-gold"
            style={{ background: CARD_BG }}
            data-ocid="golf.controls_panel"
          >
            {/* Angle */}
            <div className="flex flex-col gap-2 items-center">
              <label
                htmlFor="golf-angle"
                className="text-xs font-mono text-muted-foreground uppercase tracking-widest"
              >
                Angle
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="golf-angle"
                  type="range"
                  min={0}
                  max={180}
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  className="w-32 accent-[oklch(0.82_0.18_80)]"
                  data-ocid="golf.angle_input"
                />
                <span className="font-mono text-sm text-glow-gold w-10 text-right tabular-nums">
                  {angle}°
                </span>
              </div>
              {/* Direction preview arrow */}
              <svg
                width="56"
                height="32"
                viewBox="0 0 56 32"
                aria-hidden="true"
              >
                <line
                  x1="28"
                  y1="30"
                  x2={28 + Math.cos(((angle - 90) * Math.PI) / 180) * 26}
                  y2={30 + Math.sin(((angle - 90) * Math.PI) / 180) * 26}
                  stroke={GOLD}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="28" cy="30" r="3" fill={GOLD} />
              </svg>
            </div>

            {/* Power */}
            <div className="flex flex-col gap-2 items-center">
              <label
                htmlFor="golf-power"
                className="text-xs font-mono text-muted-foreground uppercase tracking-widest"
              >
                Power
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="golf-power"
                  type="range"
                  min={10}
                  max={100}
                  value={power}
                  onChange={(e) => setPower(Number(e.target.value))}
                  className="w-32 accent-[oklch(0.82_0.18_80)]"
                  data-ocid="golf.power_input"
                />
                <span className="font-mono text-sm text-glow-gold w-10 text-right tabular-nums">
                  {power}%
                </span>
              </div>
              <div
                className="w-40 h-2 rounded-full overflow-hidden"
                style={{ background: "oklch(0.2 0.02 265)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${power}%`,
                    background:
                      "linear-gradient(to right, oklch(0.55 0.14 80), oklch(0.82 0.18 80))",
                    boxShadow: "0 0 8px oklch(0.82 0.18 80 / 0.5)",
                    transition: "width 0.08s linear",
                  }}
                />
              </div>
            </div>

            {/* Shoot */}
            <button
              type="button"
              className="px-8 py-3 rounded-lg border-2 border-glow-gold text-glow-gold arcade-title text-base hover:bg-[oklch(0.82_0.18_80/0.15)] active:scale-95 transition-smooth"
              onClick={shoot}
              data-ocid="golf.shoot_button"
            >
              Shoot ⛳
            </button>
          </div>
        )}

        {/* Flying hint */}
        {phase === "flying" && (
          <p
            className="font-mono text-xs text-muted-foreground animate-pulse"
            data-ocid="golf.flying_state"
          >
            Ball in flight…
          </p>
        )}
      </div>
    </GameCanvas>
  );
}
