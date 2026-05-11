export type MapName = "Pyramid" | "Practice Range" | "Forest";
export type GameMode = "Free Play" | "Team Mode";
export type Team = "red" | "green" | "none";
export type WeaponId = "revolver" | "sniper" | "grenade" | "shottie" | "watergun";

export type Vec3 = { x: number; y: number; z: number };

export type ArenaCollider = {
  id: string;
  center: Vec3;
  size: Vec3;
  color: string;
  climbable?: boolean;
};

export type ArenaDefinition = {
  floorSize: number;
  bounds: number;
  floorColor: string;
  gridColor: string;
  spawns: Vec3[];
  colliders: ArenaCollider[];
  trees?: Vec3[];
  rocks?: Vec3[];
};

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
  grenade: { id: "grenade", name: "Grenade", ammo: 2, reloadMs: 2100, fireMs: 900, damage: 115, range: 8, spread: 0.01, pellets: 1, projectile: "grenade" },
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
  ammo: Record<WeaponId, number>;
  reloadingWeapon?: WeaponId;
  reloadingUntil?: number;
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
  endedAt?: number;
  returnToLobbyAt?: number;
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
  grenades: GrenadeSnapshot[];
  explosions: ExplosionSnapshot[];
  killFeed: string[];
  winner?: string;
};

export type GrenadeSnapshot = {
  id: string;
  ownerId: string;
  position: Vec3;
  velocity: Vec3;
  explodeAt: number;
};

export type ExplosionSnapshot = {
  id: string;
  position: Vec3;
  createdAt: number;
  radius: number;
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
  shotFx: (fx: { shooterId: string; from: Vec3; to: Vec3; weapon: WeaponId; hit?: Vec3; explosion?: Vec3 }) => void;
  hit: (damage: number) => void;
  killed: (victim: string) => void;
};

const pyramidStepCount = 13;
const pyramidStepHeight = 0.75;
const pyramidBaseSize = 31;
const pyramidStepInset = 1.2;

const pyramidColliders: ArenaCollider[] = [
  ...Array.from({ length: pyramidStepCount }, (_, i) => {
    const size = pyramidBaseSize - i * pyramidStepInset * 2;
    return {
      id: `pyramid-${i}`,
      center: { x: 0, y: pyramidStepHeight * (i + 0.5), z: 0 },
      size: { x: size, y: pyramidStepHeight, z: size },
      color: i % 2 === 0 ? "#ead594" : "#c7b071",
      climbable: true
    };
  }),
  { id: "pyramid-north-wall", center: { x: 0, y: 1.7, z: -46 }, size: { x: 84, y: 3.4, z: 1.6 }, color: "#b79258" },
  { id: "pyramid-south-wall", center: { x: 0, y: 1.7, z: 46 }, size: { x: 84, y: 3.4, z: 1.6 }, color: "#b79258" },
  { id: "pyramid-west-wall", center: { x: -46, y: 1.7, z: 0 }, size: { x: 1.6, y: 3.4, z: 84 }, color: "#b79258" },
  { id: "pyramid-east-wall", center: { x: 46, y: 1.7, z: 0 }, size: { x: 1.6, y: 3.4, z: 84 }, color: "#b79258" },
  ...[-25, 25].flatMap((x) => [-25, 25].map((z) => ({ id: `pyramid-cover-${x}-${z}`, center: { x, y: 0.8, z }, size: { x: 7, y: 1.6, z: 2 }, color: "#dfc47d" }))),
  ...[-15, 15].flatMap((x) => [-15, 15].map((z) => ({ id: `pyramid-pillar-${x}-${z}`, center: { x, y: 1.6, z }, size: { x: 2, y: 3.2, z: 2 }, color: "#9f7a43" }))),
  ...[[-34, -22], [-20, 34], [22, -34], [36, 18], [0, -35], [-36, 9]].map(([x, z], i) => ({ id: `pyramid-crate-${i}`, center: { x, y: 0.8, z }, size: { x: 2.8, y: 1.6, z: 2.8 }, color: "#8b5e34" }))
];

const practiceColliders: ArenaCollider[] = [
  { id: "practice-mid", center: { x: 0, y: 0.5, z: 0 }, size: { x: 12, y: 1, z: 12 }, color: "#d9e1e8", climbable: true },
  { id: "practice-left-platform", center: { x: -26, y: 3.0, z: 22 }, size: { x: 16, y: 1.1, z: 12 }, color: "#cbd5df", climbable: true },
  { id: "practice-right-platform", center: { x: 28, y: 4.8, z: -23 }, size: { x: 18, y: 1.1, z: 12 }, color: "#f1f5f9", climbable: true },
  { id: "practice-back-platform", center: { x: 0, y: 6.4, z: 43 }, size: { x: 26, y: 1, z: 7 }, color: "#cbd5df", climbable: true },
  ...[-44, 44].flatMap((x) => [-44, 44].map((z) => ({
    id: `practice-corner-platform-${x}-${z}`,
    center: { x, y: 8.05, z },
    size: { x: 15, y: 0.9, z: 15 },
    color: "#d7dde3"
  }))),
  ...[-48, 48].flatMap((x) => [-48, 48].map((z) => ({
    id: `practice-corner-ladder-${x}-${z}`,
    center: { x, y: 4.1, z },
    size: { x: 2.2, y: 7.8, z: 2.2 },
    color: "#7b8794",
    climbable: true
  }))),
  ...[-39, 39].flatMap((x) => [-39, 39].map((z) => ({
    id: `practice-corner-support-${x}-${z}`,
    center: { x, y: 4.05, z },
    size: { x: 2.3, y: 8.1, z: 2.3 },
    color: "#8994a0"
  }))),
  ...[
    { id: "practice-left-support-a", center: { x: -32, y: 1.25, z: 17.5 }, size: { x: 2.4, y: 2.5, z: 2.4 }, color: "#8f9aa5" },
    { id: "practice-left-support-b", center: { x: -20, y: 1.25, z: 26.5 }, size: { x: 2.4, y: 2.5, z: 2.4 }, color: "#8f9aa5" },
    { id: "practice-right-support-a", center: { x: 21, y: 2.15, z: -27.5 }, size: { x: 2.5, y: 4.3, z: 2.5 }, color: "#9aa5af" },
    { id: "practice-right-support-b", center: { x: 35, y: 2.15, z: -18.5 }, size: { x: 2.5, y: 4.3, z: 2.5 }, color: "#9aa5af" },
    { id: "practice-back-support-a", center: { x: -10, y: 2.95, z: 43 }, size: { x: 2.6, y: 5.9, z: 2.2 }, color: "#8f9aa5" },
    { id: "practice-back-support-b", center: { x: 10, y: 2.95, z: 43 }, size: { x: 2.6, y: 5.9, z: 2.2 }, color: "#8f9aa5" }
  ],
  { id: "practice-left-wall", center: { x: -55, y: 3.2, z: 0 }, size: { x: 1.6, y: 6.4, z: 104 }, color: "#d6dee7" },
  { id: "practice-right-wall", center: { x: 55, y: 3.2, z: 0 }, size: { x: 1.6, y: 6.4, z: 104 }, color: "#d6dee7" },
  { id: "practice-ramp-a", center: { x: -13, y: 1.5, z: 14 }, size: { x: 5, y: 0.55, z: 16 }, color: "#b7c2ce", climbable: true },
  { id: "practice-ramp-b", center: { x: 14, y: 2.6, z: -13 }, size: { x: 5, y: 0.55, z: 16 }, color: "#b7c2ce", climbable: true },
  { id: "practice-ramp-c", center: { x: 0, y: 4.1, z: 31 }, size: { x: 7, y: 0.55, z: 18 }, color: "#b7c2ce", climbable: true },
  ...[-38, -28, -18, -8, 8, 18, 28, 38].map((x, i) => ({ id: `practice-barrier-${i}`, center: { x, y: 1, z: -40 + (i % 2) * 14 }, size: { x: 2.6, y: 2, z: 8 }, color: "#ffffff" }))
];

const forestTrees = [
  [-38, -30], [-28, 16], [-16, -38], [8, 29], [29, -22], [40, 34], [0, -8], [-44, 32], [34, 7], [-8, 40], [18, -2], [-34, -2]
].map(([x, z]) => ({ x, y: 0, z }));

const forestRocks = [[-20, -20], [24, 25], [42, -38], [-42, 8], [10, 42]].map(([x, z]) => ({ x, y: 0.8, z }));

const forestColliders: ArenaCollider[] = [
  { id: "forest-hill-base", center: { x: 0, y: 1.1, z: 0 }, size: { x: 14, y: 2.2, z: 14 }, color: "#6aa84f", climbable: true },
  { id: "forest-hill-top", center: { x: 0, y: 2.55, z: 0 }, size: { x: 9, y: 0.7, z: 9 }, color: "#9ccc65", climbable: true },
  ...forestTrees.map((p, i) => ({ id: `forest-tree-${i}`, center: { x: p.x, y: 1.25, z: p.z }, size: { x: 1.8, y: 2.5, z: 1.8 }, color: "#6b4226" })),
  ...forestRocks.map((p, i) => ({ id: `forest-rock-${i}`, center: p, size: { x: 3.2, y: 1.6, z: 3.2 }, color: "#899098" })),
  ...[[-18, 5], [18, -10], [9, 34], [-36, -12], [34, 18]].map(([x, z], i) => ({ id: `forest-log-${i}`, center: { x, y: 0.55, z }, size: { x: 8, y: 1.1, z: 2.1 }, color: "#8a8176" }))
];

export const ARENAS: Record<MapName, ArenaDefinition> = {
  Pyramid: {
    floorSize: 104,
    bounds: 50,
    floorColor: "#d8c38e",
    gridColor: "#b9995d",
    spawns: [
      { x: -38, y: 1.2, z: -38 }, { x: 38, y: 1.2, z: 38 }, { x: 38, y: 1.2, z: -38 }, { x: -38, y: 1.2, z: 38 },
      { x: 0, y: 1.2, z: -42 }, { x: 0, y: 1.2, z: 42 }, { x: -42, y: 1.2, z: 0 }, { x: 42, y: 1.2, z: 0 }
    ],
    colliders: pyramidColliders
  },
  "Practice Range": {
    floorSize: 126,
    bounds: 60,
    floorColor: "#d9e1e8",
    gridColor: "#a8b4c1",
    spawns: [
      { x: -48, y: 1.2, z: -34 }, { x: 48, y: 1.2, z: 34 }, { x: -24, y: 4.75, z: 22 }, { x: 28, y: 6.55, z: -23 },
      { x: -48, y: 1.2, z: 44 }, { x: 48, y: 1.2, z: -44 }, { x: 0, y: 7.9, z: 43 }, { x: 0, y: 1.2, z: -52 }
    ],
    colliders: practiceColliders
  },
  Forest: {
    floorSize: 116,
    bounds: 54,
    floorColor: "#6fb44b",
    gridColor: "#4f8935",
    spawns: [
      { x: -44, y: 1.2, z: -38 }, { x: 42, y: 1.2, z: 38 }, { x: 28, y: 1.2, z: -42 }, { x: -38, y: 1.2, z: 34 },
      { x: 0, y: 3.95, z: 0 }, { x: -50, y: 1.2, z: 8 }, { x: 50, y: 1.2, z: -8 }, { x: 8, y: 1.2, z: 48 }
    ],
    colliders: forestColliders,
    trees: forestTrees,
    rocks: forestRocks
  }
};

export function resolvePlayerPosition(map: MapName, next: Vec3, previous?: Vec3): Vec3 {
  const arena = ARENAS[map];
  const last = previous ?? next;
  const resolved = {
    x: clamp(next.x, -arena.bounds + PLAYER_RADIUS, arena.bounds - PLAYER_RADIUS),
    y: clamp(next.y, 1.2, 12),
    z: clamp(next.z, -arena.bounds + PLAYER_RADIUS, arena.bounds - PLAYER_RADIUS)
  };
  const lastGround = supportY(arena, last);
  let ground = supportY(arena, resolved, lastGround);
  resolved.y = Math.max(resolved.y, ground);
  for (const collider of arena.colliders) {
    if (!intersectsXZ(resolved, collider)) continue;
    const top = collider.center.y + collider.size.y / 2 + 1.2;
    const bottom = collider.center.y - collider.size.y / 2;
    const canStand = collider.climbable || top - lastGround <= 0.95 || resolved.y >= top - 0.1;
    if (canStand && resolved.y >= top - 0.65) {
      resolved.y = Math.max(resolved.y, top);
      ground = Math.max(ground, top);
      continue;
    }
    if (resolved.y < bottom || resolved.y > top + PLAYER_HEIGHT) continue;
    const halfX = collider.size.x / 2 + PLAYER_RADIUS;
    const halfZ = collider.size.z / 2 + PLAYER_RADIUS;
    const dx = resolved.x - collider.center.x;
    const dz = resolved.z - collider.center.z;
    const overlapX = halfX - Math.abs(dx);
    const overlapZ = halfZ - Math.abs(dz);
    if (overlapX < overlapZ) {
      resolved.x += (dx >= 0 ? 1 : -1) * overlapX;
    } else {
      resolved.z += (dz >= 0 ? 1 : -1) * overlapZ;
    }
  }
  resolved.x = clamp(resolved.x, -arena.bounds + PLAYER_RADIUS, arena.bounds - PLAYER_RADIUS);
  resolved.z = clamp(resolved.z, -arena.bounds + PLAYER_RADIUS, arena.bounds - PLAYER_RADIUS);
  resolved.y = Math.max(resolved.y, supportY(arena, resolved, ground));
  return resolved;
}

function supportY(arena: ArenaDefinition, pos: Vec3, previousGround = 1.2) {
  let y = 1.2;
  for (const collider of arena.colliders) {
    if (!intersectsXZ(pos, collider)) continue;
    const top = collider.center.y + collider.size.y / 2 + 1.2;
    if (collider.climbable || top - previousGround <= 0.95 || pos.y >= top - 0.25) y = Math.max(y, top);
  }
  return y;
}

function intersectsXZ(pos: Vec3, collider: ArenaCollider) {
  return Math.abs(pos.x - collider.center.x) < collider.size.x / 2 + PLAYER_RADIUS && Math.abs(pos.z - collider.center.z) < collider.size.z / 2 + PLAYER_RADIUS;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

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
