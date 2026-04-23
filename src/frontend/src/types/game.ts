export type GameName = "GolfOrbit" | "SpaceShooter" | "Snake" | "FlappyBird";

export interface Score {
  gameName: GameName;
  value: number;
  achievedAt: number;
}

export type HighScores = Record<GameName, number>;

export interface GameMeta {
  id: GameName;
  title: string;
  route: string;
  accentClass: string;
  glowClass: string;
  borderGlowClass: string;
  shadowClass: string;
  emoji: string;
  description: string;
  controls: string;
}

export const GAMES: GameMeta[] = [
  {
    id: "GolfOrbit",
    title: "Golf Orbit",
    route: "/golf",
    accentClass: "text-glow-gold",
    glowClass: "glow-gold",
    borderGlowClass: "border-glow-gold",
    shadowClass: "shadow-glow-gold",
    emoji: "⛳",
    description: "Aim your shot, set the power, and sink the perfect orbit.",
    controls: "Mouse to aim • Click to set power",
  },
  {
    id: "SpaceShooter",
    title: "Space Shooter",
    route: "/shooter",
    accentClass: "text-glow-cyan",
    glowClass: "glow-cyan",
    borderGlowClass: "border-glow-cyan",
    shadowClass: "shadow-glow-cyan",
    emoji: "🚀",
    description: "Blast waves of alien invaders before they reach Earth.",
    controls: "Arrow keys / WASD to move • Space to fire",
  },
  {
    id: "Snake",
    title: "Snake",
    route: "/snake",
    accentClass: "text-glow-magenta",
    glowClass: "glow-magenta",
    borderGlowClass: "border-glow-magenta",
    shadowClass: "shadow-glow-magenta",
    emoji: "🐍",
    description: "Eat, grow, and don't bite yourself — a classic reborn.",
    controls: "Arrow keys to steer",
  },
  {
    id: "FlappyBird",
    title: "Flappy Bird",
    route: "/flappy",
    accentClass: "text-glow-purple",
    glowClass: "glow-purple",
    borderGlowClass: "border-glow-purple",
    shadowClass: "shadow-glow-purple",
    emoji: "🐦",
    description: "Tap to flap through the pipes without crashing.",
    controls: "Space / Click to flap",
  },
];

export const GAME_NAME_MAP: Record<string, GameName> = {
  GolfOrbit: "GolfOrbit",
  SpaceShooter: "SpaceShooter",
  Snake: "Snake",
  FlappyBird: "FlappyBird",
};

export const LS_KEY = "arcade_highscores";

export function loadLocalHighScores(): HighScores {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultHighScores();
    return { ...defaultHighScores(), ...JSON.parse(raw) };
  } catch {
    return defaultHighScores();
  }
}

export function saveLocalHighScore(game: GameName, score: number): HighScores {
  const current = loadLocalHighScores();
  if (score > current[game]) {
    current[game] = score;
    localStorage.setItem(LS_KEY, JSON.stringify(current));
  }
  return current;
}

function defaultHighScores(): HighScores {
  return { GolfOrbit: 0, SpaceShooter: 0, Snake: 0, FlappyBird: 0 };
}
