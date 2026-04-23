import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas } from "../components/GameCanvas";
import { useSubmitScore } from "../hooks/useSubmitScore";
import { GAMES } from "../types/game";

const game = GAMES.find((g) => g.id === "SpaceShooter")!;

// ─── Constants ────────────────────────────────────────────────────────────────
const W = 480;
const H = 600;
const PLAYER_W = 40;
const PLAYER_H = 32;
const BULLET_W = 4;
const BULLET_H = 14;
const ENEMY_W = 36;
const ENEMY_H = 28;
const PLAYER_SPEED = 4;
const BULLET_SPEED = 9;
const ENEMY_SPEED_BASE = 1.2;
const ENEMY_SIDE_SPEED = 1.4;
const SPAWN_INTERVAL = 90; // frames
const STAR_COUNT = 60;

// Neon cyan palette (chart-1 token: oklch 0.8 0.2 195)
const CYAN = "oklch(0.8 0.2 195)";
const CYAN_DIM = "oklch(0.8 0.2 195 / 0.35)";
const RED_ENEMY = "oklch(0.7 0.24 22)";
const RED_GLOW = "oklch(0.7 0.24 22 / 0.4)";
const BG_COLOR = "oklch(0.1 0.015 265)";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Vec2 {
  x: number;
  y: number;
}
interface Bullet extends Vec2 {}
interface Enemy extends Vec2 {
  dir: 1 | -1;
  hp: number;
}
interface Star extends Vec2 {
  r: number;
  speed: number;
  alpha: number;
}

type Phase = "idle" | "playing" | "over";

// ─── Game State (held in ref for rAF closure) ─────────────────────────────────
interface GameState {
  phase: Phase;
  player: Vec2;
  bullets: Bullet[];
  enemies: Enemy[];
  stars: Star[];
  score: number;
  frame: number;
  keys: Set<string>;
  fireTimer: number;
  spawnTimer: number;
  wave: number;
}

function makeStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.5 + 0.4,
    speed: Math.random() * 0.6 + 0.3,
    alpha: Math.random() * 0.6 + 0.2,
  }));
}

function initState(): GameState {
  return {
    phase: "idle",
    player: { x: W / 2 - PLAYER_W / 2, y: H - PLAYER_H - 20 },
    bullets: [],
    enemies: [],
    stars: makeStars(),
    score: 0,
    frame: 0,
    keys: new Set(),
    fireTimer: 0,
    spawnTimer: 0,
    wave: 1,
  };
}

// ─── Draw Helpers ─────────────────────────────────────────────────────────────
function drawPlayer(ctx: CanvasRenderingContext2D, p: Vec2) {
  const cx = p.x + PLAYER_W / 2;

  // Engine glow
  ctx.save();
  const grad = ctx.createRadialGradient(
    cx,
    p.y + PLAYER_H,
    0,
    cx,
    p.y + PLAYER_H,
    24,
  );
  grad.addColorStop(0, "oklch(0.8 0.2 195 / 0.7)");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(cx - 16, p.y + PLAYER_H - 10, 32, 24);
  ctx.restore();

  // Ship body
  ctx.save();
  ctx.fillStyle = CYAN_DIM;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(cx, p.y); // nose
  ctx.lineTo(p.x + PLAYER_W, p.y + PLAYER_H); // right base
  ctx.lineTo(cx, p.y + PLAYER_H - 8); // center indent
  ctx.lineTo(p.x, p.y + PLAYER_H); // left base
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Cockpit dot
  ctx.save();
  ctx.fillStyle = CYAN;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(cx, p.y + 12, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet) {
  ctx.save();
  ctx.fillStyle = CYAN;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 14;
  const x = b.x - BULLET_W / 2;
  const y = b.y;
  const r = BULLET_W / 2;
  ctx.beginPath();
  ctx.roundRect(x, y, BULLET_W, BULLET_H, r);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  const cx = e.x + ENEMY_W / 2;
  const cy = e.y + ENEMY_H / 2;

  // Glow halo
  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
  grad.addColorStop(0, RED_GLOW);
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(e.x - 8, e.y - 8, ENEMY_W + 16, ENEMY_H + 16);
  ctx.restore();

  // Enemy saucer body
  ctx.save();
  ctx.fillStyle = "oklch(0.55 0.18 22 / 0.9)";
  ctx.strokeStyle = RED_ENEMY;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = RED_ENEMY;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, ENEMY_W / 2, ENEMY_H / 2 - 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Dome
  ctx.beginPath();
  ctx.ellipse(cx, cy - 2, ENEMY_W / 3, ENEMY_H / 3, 0, Math.PI, 0);
  ctx.fillStyle = "oklch(0.72 0.22 22 / 0.7)";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, stars: Star[]) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);
  for (const s of stars) {
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Collision ────────────────────────────────────────────────────────────────
function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SpaceShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initState());
  const rafRef = useRef<number>(0);
  const [uiPhase, setUiPhase] = useState<Phase>("idle");
  const [liveScore, setLiveScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const submitScore = useSubmitScore();

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.phase = "playing";
    s.player = { x: W / 2 - PLAYER_W / 2, y: H - PLAYER_H - 20 };
    s.bullets = [];
    s.enemies = [];
    s.score = 0;
    s.frame = 0;
    s.fireTimer = 0;
    s.spawnTimer = 0;
    s.wave = 1;
    setLiveScore(0);
    setFinalScore(0);
    setUiPhase("playing");
  }, []);

  const endGame = useCallback(
    (score: number) => {
      stateRef.current.phase = "over";
      setFinalScore(score);
      setUiPhase("over");
      submitScore.mutate({ gameName: "SpaceShooter", score });
    },
    [submitScore],
  );

  // ── Tick ──────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (s.phase !== "playing") {
      drawBackground(ctx, s.stars);
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    s.frame++;

    // ── Input ──
    const keys = s.keys;
    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) {
      s.player.x = Math.max(0, s.player.x - PLAYER_SPEED);
    }
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) {
      s.player.x = Math.min(W - PLAYER_W, s.player.x + PLAYER_SPEED);
    }

    // ── Auto-fire on held Space ──
    s.fireTimer--;
    if ((keys.has(" ") || keys.has("Space")) && s.fireTimer <= 0) {
      s.bullets.push({ x: s.player.x + PLAYER_W / 2, y: s.player.y });
      s.fireTimer = 8;
    }

    // ── Move bullets ──
    s.bullets = s.bullets
      .map((b) => ({ ...b, y: b.y - BULLET_SPEED }))
      .filter((b) => b.y + BULLET_H > 0);

    // ── Spawn enemies ──
    const spawnInterval = Math.max(30, SPAWN_INTERVAL - s.wave * 5);
    s.spawnTimer++;
    if (s.spawnTimer >= spawnInterval) {
      s.spawnTimer = 0;
      const count = 1 + Math.floor(s.wave / 3);
      for (let i = 0; i < count; i++) {
        const margin = ENEMY_W + 10;
        const ex = margin + Math.random() * (W - margin * 2);
        const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
        s.enemies.push({ x: ex, y: -ENEMY_H - i * 20, dir, hp: 1 });
      }
    }

    // ── Move enemies ──
    const enemySpeed = ENEMY_SPEED_BASE + s.wave * 0.15;
    for (const e of s.enemies) {
      e.y += enemySpeed;
      e.x += e.dir * ENEMY_SIDE_SPEED;
      if (e.x <= 0 || e.x + ENEMY_W >= W) e.dir *= -1 as 1 | -1;
    }

    // ── Scroll stars ──
    for (const star of s.stars) {
      star.y += star.speed;
      if (star.y > H) {
        star.y = 0;
        star.x = Math.random() * W;
      }
    }

    // ── Collisions: bullet vs enemy ──
    const hitEnemies = new Set<Enemy>();
    const hitBullets = new Set<Bullet>();
    for (const b of s.bullets) {
      for (const e of s.enemies) {
        if (hitEnemies.has(e)) continue;
        if (
          rectsOverlap(
            b.x - BULLET_W / 2,
            b.y,
            BULLET_W,
            BULLET_H,
            e.x,
            e.y,
            ENEMY_W,
            ENEMY_H,
          )
        ) {
          hitEnemies.add(e);
          hitBullets.add(b);
          s.score += 10;
        }
      }
    }
    s.bullets = s.bullets.filter((b) => !hitBullets.has(b));
    s.enemies = s.enemies.filter((e) => !hitEnemies.has(e));

    // ── Wave progression ──
    s.wave = 1 + Math.floor(s.score / 200);

    // ── Collisions: enemy vs player ──
    for (const e of s.enemies) {
      if (
        rectsOverlap(
          s.player.x + 6,
          s.player.y + 6,
          PLAYER_W - 12,
          PLAYER_H - 6,
          e.x + 4,
          e.y + 4,
          ENEMY_W - 8,
          ENEMY_H - 8,
        )
      ) {
        endGame(s.score);
        return;
      }
      // Enemy exits bottom
      if (e.y > H + ENEMY_H) {
        // Let through — no game-over for escaping enemies, just removes them
      }
    }
    s.enemies = s.enemies.filter((e) => e.y <= H + ENEMY_H);

    // ── Render ──
    drawBackground(ctx, s.stars);
    for (const b of s.bullets) drawBullet(ctx, b);
    for (const e of s.enemies) drawEnemy(ctx, e);
    drawPlayer(ctx, s.player);

    // HUD wave indicator
    ctx.save();
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = CYAN_DIM;
    ctx.textAlign = "left";
    ctx.fillText(`WAVE ${s.wave}`, 10, H - 10);
    ctx.restore();

    // Push score to React for HUD
    setLiveScore(s.score);

    rafRef.current = requestAnimationFrame(tick);
  }, [endGame]);

  // ── rAF lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const relevant = [
        "ArrowLeft",
        "ArrowRight",
        "a",
        "A",
        "d",
        "D",
        " ",
        "Space",
      ];
      if (relevant.includes(e.key)) e.preventDefault();
      stateRef.current.keys.add(e.key);
      // Start on any key if idle
      if (stateRef.current.phase === "idle") startGame();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys.delete(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [startGame]);

  // ── Canvas click to fire ─────────────────────────────────────────────────
  const handleCanvasClick = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === "idle") {
      startGame();
      return;
    }
    if (s.phase === "playing") {
      s.bullets.push({ x: s.player.x + PLAYER_W / 2, y: s.player.y });
    }
  }, [startGame]);

  return (
    <GameCanvas
      game={game}
      score={
        uiPhase === "playing"
          ? liveScore
          : uiPhase === "over"
            ? finalScore
            : undefined
      }
      isPlaying={uiPhase === "playing"}
    >
      <div className="relative" style={{ width: W, height: H }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={handleCanvasClick}
          onKeyDown={() => {
            /* keyboard handled via window listener */
          }}
          className="block rounded-lg border border-border cursor-crosshair"
          style={{ boxShadow: "0 0 40px oklch(0.8 0.2 195 / 0.25)" }}
          tabIndex={0}
          aria-label="Space Shooter game canvas"
          data-ocid="shooter.canvas_target"
        />

        {/* ── Idle overlay ── */}
        {uiPhase === "idle" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background/80 backdrop-blur-sm rounded-lg"
            data-ocid="shooter.idle_overlay"
          >
            <span
              className="text-6xl"
              style={{
                filter: "drop-shadow(0 0 16px oklch(0.8 0.2 195 / 0.8))",
              }}
            >
              🚀
            </span>
            <h2 className="arcade-title text-3xl text-glow-cyan">
              Space Shooter
            </h2>
            <p className="text-muted-foreground text-sm text-center max-w-xs leading-relaxed">
              Destroy incoming alien saucers before they reach you.
              <br />
              Each saucer ={" "}
              <span className="text-glow-cyan font-mono">+10 pts</span>
            </p>
            <div className="px-4 py-2 rounded border border-border bg-muted/20 font-mono text-xs text-muted-foreground text-center">
              ← → or A D to move &nbsp;·&nbsp; Space / Click to fire
            </div>
            <Button
              onClick={startGame}
              className="arcade-title text-sm px-8 py-3 bg-accent/20 border border-border text-glow-cyan hover:bg-accent/30 transition-colors-fast"
              variant="outline"
              data-ocid="shooter.start_button"
            >
              START GAME
            </Button>
          </div>
        )}

        {/* ── Game Over overlay ── */}
        {uiPhase === "over" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background/85 backdrop-blur-sm rounded-lg"
            data-ocid="shooter.gameover_overlay"
          >
            <h2 className="arcade-title text-4xl text-glow-cyan">GAME OVER</h2>
            <div className="flex flex-col items-center gap-1">
              <span className="text-muted-foreground text-xs uppercase tracking-widest font-mono">
                Final Score
              </span>
              <span
                className="font-mono font-bold text-5xl text-glow-cyan"
                data-ocid="shooter.final_score"
              >
                {finalScore.toLocaleString()}
              </span>
            </div>
            {submitScore.isSuccess && (
              <p
                className="text-xs font-mono text-muted-foreground"
                data-ocid="shooter.score_saved"
              >
                ✓ Score saved
              </p>
            )}
            <div className="flex gap-3 mt-2">
              <Button
                onClick={startGame}
                className="arcade-title text-sm px-6"
                variant="outline"
                data-ocid="shooter.replay_button"
              >
                PLAY AGAIN
              </Button>
              <Button
                onClick={() => window.location.assign("/")}
                className="arcade-title text-sm px-6"
                variant="ghost"
                data-ocid="shooter.hub_button"
              >
                HUB
              </Button>
            </div>
          </div>
        )}
      </div>
    </GameCanvas>
  );
}
