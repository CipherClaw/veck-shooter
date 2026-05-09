export type MapName = "Pyramid" | "Practice Range" | "Forest";
export type GameMode = "Free Play" | "Team Mode";
export type Team = "red" | "green" | "none";
export type WeaponId = "revolver" | "sniper" | "grenade" | "shottie" | "watergun";

export type Vec3 = { x: number; y: number; z: number };

export type WeaponSpec = {
  id: WeaponId;
  name: string;
  ammo: number;
  reloadMs: number;
  fireMs: number;
  damage: number;
  range: number;
  spread: number;
  pellets: number;
  projectile?: "grenade" | "stream";
};

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  revolver: { id: "revolver", name: "Revolver", ammo: 6, reloadMs: 1300, fireMs: 430, damage: 34, range: 70, spread: 0.018, pellets: 1 },
  sniper: { id: "sniper", name: "Sniper Rifle", ammo: 4, reloadMs: 1900, fireMs: 1050, damage: 88, range: 150, spread: 0.004, pellets: 1 },
  grenade: { id: "grenade", name: "Grenade", ammo: 2, reloadMs: 2100, fireMs: 900, damage: 72, range: 35, spread: 0.01, pellets: 1, projectile: "grenade" },
  shottie: { id: "shottie", name: "Shottie", ammo: 3, reloadMs: 1500, fireMs: 760, damage: 14, range: 32, spread: 0.15, pellets: 8 },
  watergun: { id: "watergun", name: "Water Gun", ammo: 100, reloadMs: 1800, fireMs: 80, damage: 5, range: 30, spread: 0.04, pellets: 1, projectile: "stream" }
};

export const MAPS: MapName[] = ["Pyramid", "Practice Range", "Forest"];
export const DURATIONS = [3, 5, 10, 15] as const;
export const MAX_PLAYERS = 8;
export const PLAYER_RADIUS = 0.65;
export const PLAYER_HEIGHT = 2.2;

export type PlayerStats = {
  kills: number;
  deaths: number;
  wins: number;
  gamesPlayed: number;
  coins: number;
};

export type PlayerSnapshot = {
  id: string;
  name: string;
  team: Team;
  position: Vec3;
  rotationY: number;
  health: number;
  alive: boolean;
  weapon: WeaponId;
  kills: number;
  deaths: number;
  score: number;
  respawnAt?: number;
};

export type GameSummary = {
  id: string;
  map: MapName;
  mode: GameMode;
  durationMinutes: number;
  status: "waiting" | "active" | "ended";
  playerCount: number;
  maxPlayers: number;
  timeRemainingMs: number;
  createdAt: number;
};

export type ChatMessage = {
  id: string;
  scope: "lobby" | "game";
  gameId?: string;
  playerId: string;
  name: string;
  text: string;
  at: number;
};

export type GameSnapshot = {
  game: GameSummary;
  players: PlayerSnapshot[];
  killFeed: string[];
  winner?: string;
};

export type ClientInput = {
  position: Vec3;
  velocity: Vec3;
  rotationY: number;
  weapon: WeaponId;
};

export type FirePayload = {
  origin: Vec3;
  direction: Vec3;
  weapon: WeaponId;
  seq: number;
};

export type ServerToClientEvents = {
  games: (games: GameSummary[]) => void;
  lobbyChat: (messages: ChatMessage[]) => void;
  gameChat: (messages: ChatMessage[]) => void;
  snapshot: (snapshot: GameSnapshot) => void;
  stats: (stats: PlayerStats) => void;
  joined: (gameId: string, playerId: string) => void;
  rejected: (reason: string) => void;
  shotFx: (fx: { from: Vec3; to: Vec3; weapon: WeaponId; hit?: Vec3; explosion?: Vec3 }) => void;
  hit: (damage: number) => void;
  killed: (victim: string) => void;
};

export type ClientToServerEvents = {
  hello: (payload: { playerId: string; name: string }) => void;
  setName: (name: string) => void;
  createGame: (payload: { map: MapName; mode: GameMode; durationMinutes: number; weapon: WeaponId }) => void;
  joinGame: (payload: { gameId: string; weapon: WeaponId }) => void;
  leaveGame: () => void;
  input: (input: ClientInput) => void;
  fire: (payload: FirePayload) => void;
  reload: (weapon: WeaponId) => void;
  chat: (payload: { scope: "lobby" | "game"; gameId?: string; text: string }) => void;
  respawn: (weapon: WeaponId) => void;
};
