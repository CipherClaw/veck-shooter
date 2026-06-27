export type MapName = "Pyramid" | "Practice Range" | "Forest" | "Subway" | "Blueprint" | "Bank Heist";
export type GameMode = "Free Play" | "Team Mode" | "Gun Game";
export type Team = "red" | "green" | "none";
export type WeaponId = "revolver" | "sniper" | "grenade" | "shottie" | "watergun";

export type Vec3 = { x: number; y: number; z: number };

export type ArenaCollider = {
  id: string;
  center: Vec3;
  size: Vec3;
  color: string;
  climbable?: boolean;
  ladder?: boolean;
  ladderNormal?: { x: number; z: number };
};

export type ArenaBouncePad = {
  id: string;
  center: Vec3;
  radius: number;
  height: number;
  color: string;
  launchVelocity: number;
};

export type ArenaDefinition = {
  floorSize: number;
  bounds: number;
  playBounds?: number;
  ceiling?: number;
  occludeShots?: boolean;
  floorColor: string;
  gridColor: string;
  spawns: Vec3[];
  colliders: ArenaCollider[];
  bouncePads?: ArenaBouncePad[];
  trees?: Vec3[];
  rocks?: Vec3[];
};

export type LadderContact = {
  topY: number;
  bottomY: number;
  exit: Vec3;
  mount: Vec3;
  normal: { x: number; z: number };
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
  sniper: { id: "sniper", name: "Sniper Rifle", ammo: 4, reloadMs: 1900, fireMs: 1050, damage: 88, range: 240, spread: 0.0025, pellets: 1 },
  grenade: { id: "grenade", name: "Grenade", ammo: 2, reloadMs: 2100, fireMs: 900, damage: 115, range: 8, spread: 0.01, pellets: 1, projectile: "grenade" },
  shottie: { id: "shottie", name: "Shottie", ammo: 3, reloadMs: 1500, fireMs: 760, damage: 14, range: 32, spread: 0.15, pellets: 8 },
  watergun: { id: "watergun", name: "Water Gun", ammo: 100, reloadMs: 1800, fireMs: 80, damage: 5, range: 30, spread: 0.04, pellets: 1, projectile: "stream" }
};

export const MAPS: MapName[] = ["Pyramid", "Practice Range", "Forest", "Subway", "Blueprint", "Bank Heist"];
export const DURATIONS = [3, 5, 10, 15] as const;
export const MAX_PLAYERS = 8;
export const PLAYER_RADIUS = 0.65;
export const PLAYER_HEIGHT = 2.2;
export const GRENADE_RADIUS = 0.2;
export const LADDER_CLIMB_SPEED = 4.2;
export const BOUNCE_PAD_LAUNCH_SPEED = 17;
export const HEALTH_PACK_HEAL = 35;
export const HEALTH_PACK_PICKUP_RADIUS = 1.6;
export const HEALTH_PACK_RESPAWN_MS = 18000;
export const MAX_HEALTH_PACKS = 3;

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
  healthPacks: HealthPackSnapshot[];
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

export type HealthPackSnapshot = {
  id: string;
  position: Vec3;
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

const practiceDeckHeight = 0.9;
const practiceTowerStandY = 22;
const practiceHouseRoofStandY = 28;
const practiceWallColor = "#e2e8f0";
const practiceDeckColor = "#f8fafc";
const practiceTrimColor = "#cbd5df";

function practiceDeck(id: string, x: number, z: number, width: number, depth: number, standY: number, color = practiceDeckColor): ArenaCollider {
  return {
    id,
    center: { x, y: standY - 1.2 - practiceDeckHeight / 2, z },
    size: { x: width, y: practiceDeckHeight, z: depth },
    color
  };
}

function practiceBlock(id: string, x: number, z: number, width: number, depth: number, height: number, color = practiceWallColor, climbable = false): ArenaCollider {
  return {
    id,
    center: { x, y: height / 2, z },
    size: { x: width, y: height, z: depth },
    color,
    climbable
  };
}

function practiceLadder(id: string, x: number, z: number, bottomY: number, topY: number, ladderNormal: { x: number; z: number }): ArenaCollider {
  return {
    id,
    center: { x, y: (bottomY + topY) / 2 - 1.2, z },
    size: { x: 1.9, y: topY - bottomY, z: 1.9 },
    color: "#9aa5af",
    ladder: true,
    ladderNormal
  };
}

function practiceCornerTower(sx: -1 | 1, sz: -1 | 1): ArenaCollider[] {
  const x = sx * 50;
  const z = sz * 50;
  const roofSize = 15;
  const pillarOffset = roofSize / 2 - 1.1;
  const pillarHeight = practiceTowerStandY - 1.2;
  const ladderX = x - sx * (roofSize / 2 + 1.0);
  const ladderZ = z;

  return [
    practiceDeck(`practice-corner-tower-roof-${sx}-${sz}`, x, z, roofSize, roofSize, practiceTowerStandY, "#f1f5f9"),
    practiceDeck(`practice-corner-tower-mid-${sx}-${sz}`, x, z, 11.5, 11.5, 12, "#ffffff"),
    ...[-1, 1].flatMap((px) => [-1, 1].map((pz) => ({
      id: `practice-corner-tower-pillar-${sx}-${sz}-${px}-${pz}`,
      center: { x: x + px * pillarOffset, y: pillarHeight / 2, z: z + pz * pillarOffset },
      size: { x: 1.9, y: pillarHeight, z: 1.9 },
      color: px === pz ? "#cbd5df" : "#d6dee7"
    }))),
    practiceBlock(`practice-corner-tower-back-wall-${sx}-${sz}`, x + sx * 7.15, z, 1.4, 12, 12.4, practiceTrimColor),
    practiceBlock(`practice-corner-tower-side-wall-${sx}-${sz}`, x, z + sz * 7.15, 12, 1.4, 12.4, practiceTrimColor),
    practiceLadder(`practice-ladder-corner-${sx}-${sz}`, ladderX, ladderZ, 1.2, practiceTowerStandY, { x: -sx, z: 0 })
  ];
}

function practiceHouseColliders(): ArenaCollider[] {
  const roofBottom = practiceHouseRoofStandY - 1.2 - practiceDeckHeight;
  const wallHeight = roofBottom;
  return [
    practiceDeck("practice-house-roof", 0, 0, 30, 30, practiceHouseRoofStandY, "#ffffff"),
    practiceDeck("practice-house-floor-low", 0, 0, 25, 25, 10, "#f8fafc"),
    practiceDeck("practice-house-floor-mid", 0, 0, 21, 21, 19, "#f1f5f9"),
    practiceBlock("practice-house-north-wall-west", -8.2, -15, 13.6, 1.6, wallHeight, practiceWallColor),
    practiceBlock("practice-house-north-wall-east", 8.2, -15, 13.6, 1.6, wallHeight, practiceWallColor),
    practiceBlock("practice-house-south-wall-west", -8.2, 15, 13.6, 1.6, wallHeight, "#f1f5f9"),
    practiceBlock("practice-house-south-wall-east", 8.2, 15, 13.6, 1.6, wallHeight, "#f1f5f9"),
    practiceBlock("practice-house-west-wall-north", -15, -8.2, 1.6, 13.6, wallHeight, "#e2e8f0"),
    practiceBlock("practice-house-west-wall-south", -15, 8.2, 1.6, 13.6, wallHeight, "#e2e8f0"),
    practiceBlock("practice-house-east-wall-north", 15, -8.2, 1.6, 13.6, wallHeight, "#d6dee7"),
    practiceBlock("practice-house-east-wall-south", 15, 8.2, 1.6, 13.6, wallHeight, "#d6dee7"),
    practiceBlock("practice-house-core-column", 0, 0, 3.2, 3.2, roofBottom, "#cbd5df"),
    practiceBlock("practice-house-entry-left", -5.2, -18.4, 4.4, 4.6, 3.2, "#ffffff", true),
    practiceBlock("practice-house-entry-right", 5.2, -18.4, 4.4, 4.6, 3.2, "#ffffff", true)
  ];
}

const practiceColliders: ArenaCollider[] = [
  ...[
    [0, -62, 124, 4.2, 1.8, "practice-perimeter-north"],
    [0, 62, 124, 4.2, 1.8, "practice-perimeter-south"],
    [-62, 0, 1.8, 4.2, 124, "practice-perimeter-west"],
    [62, 0, 1.8, 4.2, 124, "practice-perimeter-east"]
  ].map(([x, z, sx, sy, sz, id]) => ({
    id: id as string,
    center: { x: x as number, y: (sy as number) / 2, z: z as number },
    size: { x: sx as number, y: sy as number, z: sz as number },
    color: "#d6dee7"
  })),
  ...practiceCornerTower(-1, -1),
  ...practiceCornerTower(1, -1),
  ...practiceCornerTower(-1, 1),
  ...practiceCornerTower(1, 1),
  ...practiceHouseColliders(),
  practiceDeck("practice-overlook-west", -31, 0, 11, 30, 8, "#ffffff"),
  practiceDeck("practice-overlook-east", 31, 0, 11, 30, 8, "#f8fafc"),
  practiceDeck("practice-right-platform", 28, -23, 18, 12, 6.55, "#f1f5f9"),
  practiceBlock("practice-overlook-west-support-a", -31, -12, 2.4, 2.4, 6.8, "#9aa5af"),
  practiceBlock("practice-overlook-west-support-b", -31, 12, 2.4, 2.4, 6.8, "#9aa5af"),
  practiceBlock("practice-overlook-east-support-a", 31, -12, 2.4, 2.4, 6.8, "#8f9aa5"),
  practiceBlock("practice-overlook-east-support-b", 31, 12, 2.4, 2.4, 6.8, "#8f9aa5"),
  practiceLadder("practice-ladder-legacy-southeast", 50, 42.15, 1.2, 12, { x: 0, z: -1 }),
  ...[
    [-43, -8, 5, 2.2, 12],
    [43, 9, 5, 2.2, 12],
    [-12, 42, 15, 2.2, 4],
    [16, -42, 14, 2.2, 4],
    [-34, 34, 8, 2.8, 5],
    [34, -34, 8, 2.8, 5],
    [0, 39, 6, 4.6, 6],
    [0, -39, 6, 4.6, 6]
  ].map(([x, z, sx, sy, sz], i) => ({
    id: `practice-ground-cover-${i}`,
    center: { x, y: sy / 2, z },
    size: { x: sx, y: sy, z: sz },
    color: i % 2 === 0 ? "#ffffff" : "#e2e8f0",
    climbable: sy <= 2.2
  }))
];

const practiceBouncePads: ArenaBouncePad[] = [
  { id: "practice-right-platform-bounce", center: { x: 18.4, y: 0.08, z: -15.6 }, radius: 2.15, height: 0.16, color: "#55d66b", launchVelocity: BOUNCE_PAD_LAUNCH_SPEED },
  { id: "practice-house-bounce-north", center: { x: 0, y: 0.1, z: -26 }, radius: 2.8, height: 0.2, color: "#55d66b", launchVelocity: 33 },
  { id: "practice-house-bounce-south", center: { x: 0, y: 0.1, z: 26 }, radius: 2.8, height: 0.2, color: "#55d66b", launchVelocity: 33 },
  { id: "practice-house-bounce-west", center: { x: -39.3, y: 0.1, z: 0 }, radius: 2.6, height: 0.2, color: "#63e6be", launchVelocity: 18.2 },
  { id: "practice-house-bounce-east", center: { x: 39.3, y: 0.1, z: 0 }, radius: 2.6, height: 0.2, color: "#63e6be", launchVelocity: 18.2 }
];

const forestTrees = [
  [-38, -30], [-28, 16], [-16, -38], [8, 29], [29, -22], [40, 34], [0, -8], [-44, 32], [34, 7], [-8, 40], [18, -2], [-34, -2]
].map(([x, z]) => ({ x, y: 0, z }));

const forestRocks = [[-20, -20], [24, 25], [42, -38], [-42, 8], [10, 42]].map(([x, z]) => ({ x, y: 0.8, z }));

const forestClimberTrees = [
  { x: -46, z: -14 },
  { x: 14, z: -36 },
  { x: -18, z: 30 },
  { x: 46, z: 12 }
];

const forestBranchStandYs = Array.from({ length: 11 }, (_, i) => 2.45 + i * 1.3);
const forestBranchHeight = 0.4;

function forestClimberColliders(): ArenaCollider[] {
  const directions = [
    { x: 1, z: 0 },
    { x: 0, z: 1 },
    { x: -1, z: 0 },
    { x: 0, z: -1 }
  ];
  return forestClimberTrees.flatMap((tree, treeIndex) => [
    {
      id: `forest-climb-trunk-${treeIndex}`,
      center: { x: tree.x, y: 7.9, z: tree.z },
      size: { x: 1.3, y: 15.8, z: 1.3 },
      color: "#5a351f"
    },
    ...forestBranchStandYs.map((standY, branchIndex) => {
      const direction = directions[branchIndex % directions.length];
      const center = {
        x: tree.x + direction.x * 1.55,
        y: standY - 1.2 - forestBranchHeight / 2,
        z: tree.z + direction.z * 1.55
      };
      const alongX = direction.x !== 0;
      return {
        id: `forest-climb-branch-${treeIndex}-${branchIndex}`,
        center,
        size: { x: alongX ? 2.8 : 2.15, y: forestBranchHeight, z: alongX ? 2.15 : 2.8 },
        color: branchIndex % 2 === 0 ? "#6a4128" : "#70492f",
        climbable: true
      };
    })
  ]);
}

const forestColliders: ArenaCollider[] = [
  { id: "forest-hill-base", center: { x: 0, y: 1.1, z: 0 }, size: { x: 14, y: 2.2, z: 14 }, color: "#6aa84f", climbable: true },
  { id: "forest-hill-top", center: { x: 0, y: 2.55, z: 0 }, size: { x: 9, y: 0.7, z: 9 }, color: "#9ccc65", climbable: true },
  ...forestTrees.map((p, i) => ({ id: `forest-tree-${i}`, center: { x: p.x, y: 1.25, z: p.z }, size: { x: 1.8, y: 2.5, z: 1.8 }, color: "#6b4226" })),
  ...forestClimberColliders(),
  ...forestRocks.map((p, i) => ({ id: `forest-rock-${i}`, center: p, size: { x: 3.2, y: 1.6, z: 3.2 }, color: "#899098" })),
  ...[[-18, 5], [18, -10], [9, 34], [-36, -12], [34, 18]].map(([x, z], i) => ({ id: `forest-log-${i}`, center: { x, y: 0.55, z }, size: { x: 8, y: 1.1, z: 2.1 }, color: "#8a8176" }))
];

const subwayWalkwayTop = 1.3;
const subwayDeckTop = 7.0;
const subwaySidewalkTop = subwayDeckTop + 0.2;
const subwayCurbTop = subwayDeckTop + 0.32;
const subwaySidewalkColor = "#9b978d";
const subwayCurbColor = "#c7c3b6";
const subwayStepHeight = 0.45;
const subwayStepStandYs = [3.15, 3.8, 4.45, 5.1, 5.75, 6.4, 7.05, 7.7];

function subwayRaisedSurface(id: string, x: number, z: number, width: number, depth: number, top: number, color: string): ArenaCollider {
  const height = Math.max(0.12, top - subwayDeckTop);
  return {
    id,
    center: { x, y: top - height / 2, z },
    size: { x: width, y: height, z: depth },
    color
  };
}

function subwayCornerName(sx: -1 | 1, sz: -1 | 1) {
  return `${sz > 0 ? "n" : "s"}${sx > 0 ? "e" : "w"}`;
}

function subwayCornerSidewalk(sx: -1 | 1, sz: -1 | 1): ArenaCollider[] {
  const corner = subwayCornerName(sx, sz);
  const localX = (min: number, max: number) => sx * ((min + max) / 2);
  const localZ = (min: number, max: number) => sz * ((min + max) / 2);
  const surface = (id: string, minX: number, maxX: number, minZ: number, maxZ: number, top = subwaySidewalkTop, color = subwaySidewalkColor) =>
    subwayRaisedSurface(`${id}-${corner}`, localX(minX, maxX), localZ(minZ, maxZ), maxX - minX, maxZ - minZ, top, color);

  return [
    surface("subway-sidewalk-inner", 24.5, 56.5, 24.5, 32),
    surface("subway-sidewalk-mid-inside", 24.5, 34.8, 32, 36),
    surface("subway-sidewalk-mid-outside", 41.2, 56.5, 32, 36),
    surface("subway-sidewalk-outer", 24.5, 56.5, 36, 56.5),
    surface("subway-curb-x", 24.5, 25.15, 24.5, 56.5, subwayCurbTop, subwayCurbColor),
    surface("subway-curb-z", 24.5, 56.5, 24.5, 25.15, subwayCurbTop, subwayCurbColor)
  ];
}

function subwayEntranceSidewalk(zSign: -1 | 1): ArenaCollider[] {
  const end = zSign > 0 ? "north" : "south";
  const surface = (id: string, x: number, z: number, width: number, depth: number, top = subwaySidewalkTop, color = subwaySidewalkColor) =>
    subwayRaisedSurface(`${id}-${end}`, x, z, width, depth, top, color);

  return [-1, 1].flatMap((side) => {
    const sideName = side > 0 ? "east" : "west";
    const sidewalkCenterX = side * 23.85;
    const curbCenterX = side * 23.525;
    const z = zSign * 40.5;
    return [
      surface(`subway-sidewalk-arm-${sideName}`, sidewalkCenterX, z, 1.3, 32),
      surface(`subway-curb-arm-${sideName}`, curbCenterX, z, 0.65, 32, subwayCurbTop, subwayCurbColor)
    ];
  });
}

function subwayStairFlight(side: -1 | 1, zSign: -1 | 1): ArenaCollider[] {
  const x = side * 16.5;
  const zBottom = zSign * 24;
  const zTop = zSign * 38;
  return subwayStepStandYs.map((standY, i) => {
    const t = subwayStepStandYs.length === 1 ? 0 : i / (subwayStepStandYs.length - 1);
    const z = zBottom + (zTop - zBottom) * t;
    const top = standY - 1.2;
    return {
      id: `subway-stair-${side > 0 ? "east" : "west"}-${zSign > 0 ? "north" : "south"}-${i}`,
      center: { x, y: top - subwayStepHeight / 2, z },
      size: { x: 8, y: subwayStepHeight, z: 3.4 },
      color: i % 2 === 0 ? "#8b8f94" : "#747a80",
      climbable: true
    };
  });
}

function subwayStairBackWall(side: -1 | 1, zSign: -1 | 1): ArenaCollider[] {
  const x = side * 16.5;
  const sideName = side > 0 ? "east" : "west";
  const endName = zSign > 0 ? "north" : "south";
  return [
    {
      id: `subway-stair-back-${sideName}-${endName}`,
      center: { x, y: 2.85, z: zSign * 39.1 },
      size: { x: 9, y: 3.7, z: 0.8 },
      color: "#20282d"
    }
  ];
}

function subwayStairUndersideFill(side: -1 | 1, zSign: -1 | 1): ArenaCollider[] {
  const x = side * 16.5;
  const zBottom = zSign * 24;
  const zTop = zSign * 38;
  const bottom = 1.0;
  const sideName = side > 0 ? "east" : "west";
  const endName = zSign > 0 ? "north" : "south";

  return subwayStepStandYs.slice(2).map((standY, index) => {
    const i = index + 2;
    const t = subwayStepStandYs.length === 1 ? 0 : i / (subwayStepStandYs.length - 1);
    const z = zBottom + (zTop - zBottom) * t;
    const top = standY - 1.2 - subwayStepHeight - 0.05;
    return {
      id: `subway-stair-fill-${sideName}-${endName}-${i}`,
      center: { x, y: (bottom + top) / 2, z },
      size: { x: 8, y: top - bottom, z: 3.4 },
      color: "#20282d"
    };
  });
}

function subwayEntranceRailings(side: -1 | 1, zSign: -1 | 1): ArenaCollider[] {
  const x = side * 16.5;
  const z = zSign * 23.2;
  const sideName = side > 0 ? "east" : "west";
  const endName = zSign > 0 ? "north" : "south";
  const world = (localX: number, localZ: number) => ({
    x: zSign > 0 ? x - localX : x + localX,
    y: 7.6,
    z: zSign > 0 ? z - localZ : z + localZ
  });

  return [
    {
      id: `subway-railing-${sideName}-${endName}-left`,
      center: world(-4.65, -8.8),
      size: { x: 0.45, y: 1.2, z: 16.0 },
      color: "#14532d"
    },
    {
      id: `subway-railing-${sideName}-${endName}-right`,
      center: world(4.65, -8.8),
      size: { x: 0.45, y: 1.2, z: 16.0 },
      color: "#14532d"
    },
    {
      id: `subway-railing-${sideName}-${endName}-back`,
      center: world(0, -0.8),
      size: { x: 9.45, y: 1.2, z: 0.45 },
      color: "#14532d"
    }
  ];
}

const subwayColumnZs = [-48, -36, -24, -12, 0, 12, 24, 36, 48];
const subwayColliders: ArenaCollider[] = [
  { id: "subway-platform-west", center: { x: -16.5, y: subwayWalkwayTop - 0.6, z: 0 }, size: { x: 11, y: 1.2, z: 110 }, color: "#8f8a81" },
  { id: "subway-platform-east", center: { x: 16.5, y: subwayWalkwayTop - 0.6, z: 0 }, size: { x: 11, y: 1.2, z: 110 }, color: "#8f8a81" },
  { id: "subway-deck-center", center: { x: 0, y: subwayDeckTop - 0.4, z: 0 }, size: { x: 48, y: 0.8, z: 48 }, color: "#2f3236" },
  { id: "subway-deck-north-back", center: { x: 0, y: subwayDeckTop - 0.4, z: 49 }, size: { x: 48, y: 0.8, z: 18 }, color: "#2f3236" },
  { id: "subway-deck-north-front-left", center: { x: -22.5, y: subwayDeckTop - 0.4, z: 32 }, size: { x: 3, y: 0.8, z: 16 }, color: "#2f3236" },
  { id: "subway-deck-north-front-mid", center: { x: 0, y: subwayDeckTop - 0.4, z: 32 }, size: { x: 24, y: 0.8, z: 16 }, color: "#2f3236" },
  { id: "subway-deck-north-front-right", center: { x: 22.5, y: subwayDeckTop - 0.4, z: 32 }, size: { x: 3, y: 0.8, z: 16 }, color: "#2f3236" },
  { id: "subway-deck-south-back", center: { x: 0, y: subwayDeckTop - 0.4, z: -49 }, size: { x: 48, y: 0.8, z: 18 }, color: "#2f3236" },
  { id: "subway-deck-south-front-left", center: { x: -22.5, y: subwayDeckTop - 0.4, z: -32 }, size: { x: 3, y: 0.8, z: 16 }, color: "#2f3236" },
  { id: "subway-deck-south-front-mid", center: { x: 0, y: subwayDeckTop - 0.4, z: -32 }, size: { x: 24, y: 0.8, z: 16 }, color: "#2f3236" },
  { id: "subway-deck-south-front-right", center: { x: 22.5, y: subwayDeckTop - 0.4, z: -32 }, size: { x: 3, y: 0.8, z: 16 }, color: "#2f3236" },
  { id: "subway-deck-east-road", center: { x: 41, y: subwayDeckTop - 0.4, z: 0 }, size: { x: 34, y: 0.8, z: 48 }, color: "#2f3236" },
  { id: "subway-deck-west-road", center: { x: -41, y: subwayDeckTop - 0.4, z: 0 }, size: { x: 34, y: 0.8, z: 48 }, color: "#2f3236" },
  { id: "subway-deck-corner-ne", center: { x: 41, y: subwayDeckTop - 0.4, z: 41 }, size: { x: 34, y: 0.8, z: 34 }, color: "#2f3236" },
  { id: "subway-deck-corner-nw", center: { x: -41, y: subwayDeckTop - 0.4, z: 41 }, size: { x: 34, y: 0.8, z: 34 }, color: "#2f3236" },
  { id: "subway-deck-corner-se", center: { x: 41, y: subwayDeckTop - 0.4, z: -41 }, size: { x: 34, y: 0.8, z: 34 }, color: "#2f3236" },
  { id: "subway-deck-corner-sw", center: { x: -41, y: subwayDeckTop - 0.4, z: -41 }, size: { x: 34, y: 0.8, z: 34 }, color: "#2f3236" },
  ...subwayCornerSidewalk(1, 1),
  ...subwayCornerSidewalk(-1, 1),
  ...subwayCornerSidewalk(1, -1),
  ...subwayCornerSidewalk(-1, -1),
  ...subwayEntranceSidewalk(1),
  ...subwayEntranceSidewalk(-1),
  { id: "subway-wall-west", center: { x: -57.5, y: 3.0, z: 0 }, size: { x: 1.8, y: 6.0, z: 116 }, color: "#5a5f63" },
  { id: "subway-wall-east", center: { x: 57.5, y: 3.0, z: 0 }, size: { x: 1.8, y: 6.0, z: 116 }, color: "#5a5f63" },
  { id: "subway-wall-north", center: { x: 0, y: 3.0, z: 57.5 }, size: { x: 116, y: 6.0, z: 1.8 }, color: "#5a5f63" },
  { id: "subway-wall-south", center: { x: 0, y: 3.0, z: -57.5 }, size: { x: 116, y: 6.0, z: 1.8 }, color: "#5a5f63" },
  { id: "subway-station-back-west", center: { x: -23.5, y: 2.55, z: 0 }, size: { x: 0.6, y: 2.5, z: 100 }, color: "#5a5f63" },
  { id: "subway-station-back-east", center: { x: 23.5, y: 2.55, z: 0 }, size: { x: 0.6, y: 2.5, z: 100 }, color: "#5a5f63" },
  ...subwayColumnZs.map((z) => ({ id: `subway-column-center-${z}`, center: { x: 0, y: 2.95, z }, size: { x: 1.35, y: 5.9, z: 1.35 }, color: "#14532d" })),
  ...[-11, 11, -21, 21].flatMap((x) => subwayColumnZs.filter((_, i) => i % 2 === 0).map((z) => ({
    id: `subway-column-edge-${x}-${z}`,
    center: { x, y: 2.7, z },
    size: { x: 1.15, y: 5.4, z: 1.15 },
    color: Math.abs(x) === 11 ? "#36404a" : "#14532d"
  }))),
  { id: "subway-train-a", center: { x: -6, y: 1.65, z: -27 }, size: { x: 6.4, y: 3.3, z: 25 }, color: "#b8bcc2" },
  { id: "subway-train-b", center: { x: 6, y: 1.65, z: 27 }, size: { x: 6.4, y: 3.3, z: 25 }, color: "#b8bcc2" },
  ...subwayStairFlight(-1, 1),
  ...subwayStairFlight(-1, -1),
  ...subwayStairFlight(1, 1),
  ...subwayStairFlight(1, -1),
  ...subwayStairBackWall(-1, 1),
  ...subwayStairBackWall(-1, -1),
  ...subwayStairBackWall(1, 1),
  ...subwayStairBackWall(1, -1),
  ...subwayStairUndersideFill(-1, 1),
  ...subwayStairUndersideFill(-1, -1),
  ...subwayStairUndersideFill(1, 1),
  ...subwayStairUndersideFill(1, -1),
  ...subwayEntranceRailings(-1, 1),
  ...subwayEntranceRailings(-1, -1),
  ...subwayEntranceRailings(1, 1),
  ...subwayEntranceRailings(1, -1),
  ...[
    [-38, -34], [38, 34], [-46, 12], [45, -16]
  ].map(([x, z], i) => ({ id: `subway-taxi-cover-${i}`, center: { x, y: 7.6, z }, size: { x: 5.2, y: 1.2, z: 2.7 }, color: "#f2c230" }))
];

const blueprintDeckHeight = 0.8;
const blueprintWallColor = "#1e40af";
const blueprintDeckColor = "#2563eb";
const blueprintBrightColor = "#3b82f6";

function blueprintDeck(id: string, x: number, z: number, width: number, depth: number, standY: number, color = blueprintDeckColor): ArenaCollider {
  return {
    id,
    center: { x, y: standY - 1.2 - blueprintDeckHeight / 2, z },
    size: { x: width, y: blueprintDeckHeight, z: depth },
    color
  };
}

function blueprintLadder(
  id: string,
  x: number,
  z: number,
  bottomY: number,
  topY: number,
  ladderNormal: { x: number; z: number }
): ArenaCollider {
  return {
    id,
    center: { x, y: (bottomY + topY) / 2 - 1.2, z },
    size: { x: 1.9, y: topY - bottomY, z: 1.9 },
    color: "#bfdbfe",
    ladder: true,
    ladderNormal
  };
}

function blueprintTower(id: string, x: number, z: number, width: number, depth: number, levels: number[]): ArenaCollider[] {
  const topStand = Math.max(...levels);
  const wallHeight = topStand - 1.2;
  const wallY = wallHeight / 2;
  const pillar = 1.4;
  return [
    { id: `blueprint-${id}-northwest-slab`, center: { x: x - width / 2 + pillar / 2, y: wallY, z: z - depth / 2 + pillar / 2 }, size: { x: pillar, y: wallHeight, z: pillar }, color: blueprintWallColor },
    { id: `blueprint-${id}-northeast-slab`, center: { x: x + width / 2 - pillar / 2, y: wallY, z: z - depth / 2 + pillar / 2 }, size: { x: pillar, y: wallHeight, z: pillar }, color: "#1d4ed8" },
    { id: `blueprint-${id}-southwest-slab`, center: { x: x - width / 2 + pillar / 2, y: wallY, z: z + depth / 2 - pillar / 2 }, size: { x: pillar, y: wallHeight, z: pillar }, color: blueprintBrightColor },
    { id: `blueprint-${id}-southeast-slab`, center: { x: x + width / 2 - pillar / 2, y: wallY, z: z + depth / 2 - pillar / 2 }, size: { x: pillar, y: wallHeight, z: pillar }, color: "#60a5fa" },
    ...levels.map((standY, i) => blueprintDeck(`blueprint-${id}-deck-${i + 1}`, x, z, width - 3.2, depth - 3.2, standY, i % 2 === 0 ? blueprintDeckColor : "#1d4ed8"))
  ];
}

function blueprintTowerClimb(id: string, cx: number, cz: number, width: number, depth: number, levels: number[]): ArenaCollider[] {
  const halfW = (width - 3.2) / 2;
  const halfD = (depth - 3.2) / 2;
  const ladderOut = 1.0;
  const ledgeOut = 3.0;
  const ledgeIn = 1.2;
  const ledgeSpan = 5.8;
  const ledgeDepth = ledgeOut + ledgeIn;
  const ledgeThick = 0.8;
  const faces = [
    { x: 0, z: -1 },
    { x: 1, z: 0 },
    { x: 0, z: 1 },
    { x: -1, z: 0 }
  ];
  const out: ArenaCollider[] = [];

  for (let i = 0; i < levels.length; i++) {
    const n = faces[i % faces.length];
    const bottomY = i === 0 ? 1.2 : levels[i - 1];
    const topY = levels[i];
    const lx = cx + n.x * (halfW + ladderOut);
    const lz = cz + n.z * (halfD + ladderOut);

    out.push(blueprintLadder(`blueprint-ladder-${id}-${i}`, lx, lz, bottomY, topY, { x: n.x, z: n.z }));

    if (i > 0) {
      const ledgeCenterOut = (ledgeOut - ledgeIn) / 2;
      const ex = cx + n.x * (halfW + ledgeCenterOut);
      const ez = cz + n.z * (halfD + ledgeCenterOut);
      const alongX = n.z !== 0;

      out.push({
        id: `blueprint-ledge-${id}-${i}`,
        center: { x: ex, y: bottomY - 1.2 - ledgeThick / 2, z: ez },
        size: { x: alongX ? ledgeSpan : ledgeDepth, y: ledgeThick, z: alongX ? ledgeDepth : ledgeSpan },
        color: "#1d4ed8",
        climbable: true
      });
    }
  }

  return out;
}

const blueprintColliders: ArenaCollider[] = [
  ...blueprintTower("central", -18, -10, 22, 20, [7, 14, 21, 28]),
  ...blueprintTower("east", 28, 18, 18, 24, [7, 14, 21]),
  ...blueprintTower("northwest", -40, 32, 20, 18, [7, 14, 21, 28]),
  ...blueprintTower("southeast", 42, -34, 18, 18, [7, 14]),
  ...blueprintTower("southwest", -34, -38, 24, 16, [7, 14, 21]),
  blueprintDeck("blueprint-skybridge-west", -29.5, 11, 7, 38, 14, "#1e3a8a"),
  blueprintDeck("blueprint-skybridge-east", 6, 3, 31.2, 11.2, 21, "#1e3a8a"),
  blueprintDeck("blueprint-low-bridge-south", 5.5, -36, 60.2, 5, 7, "#1d4ed8"),
  blueprintDeck("blueprint-mid-overlook", 16, -14, 18, 10, 14, "#2563eb"),
  ...blueprintTowerClimb("central", -18, -10, 22, 20, [7, 14, 21, 28]),
  ...blueprintTowerClimb("east", 28, 18, 18, 24, [7, 14, 21]),
  ...blueprintTowerClimb("northwest", -40, 32, 20, 18, [7, 14, 21, 28]),
  ...blueprintTowerClimb("southeast", 42, -34, 18, 18, [7, 14]),
  ...blueprintTowerClimb("southwest", -34, -38, 24, 16, [7, 14, 21]),
  ...[
    [-56, 0, 1.8, 7.2, 112, "blueprint-wall-west"],
    [56, 0, 1.8, 7.2, 112, "blueprint-wall-east"],
    [0, -56, 112, 7.2, 1.8, "blueprint-wall-north"],
    [0, 56, 112, 7.2, 1.8, "blueprint-wall-south"]
  ].map(([x, z, sx, sy, sz, id]) => ({
    id: id as string,
    center: { x: x as number, y: (sy as number) / 2, z: z as number },
    size: { x: sx as number, y: sy as number, z: sz as number },
    color: "#1e3a8a"
  })),
  ...[
    [-4, 30, 10, 2.2, 4],
    [14, 38, 5, 5.4, 5],
    [48, 3, 6, 3.2, 8],
    [-12, -50, 12, 2.4, 4],
    [-51, -8, 4, 4.6, 10],
    [0, 0, 8, 2.0, 8]
  ].map(([x, z, sx, sy, sz], i) => ({
    id: `blueprint-base-cover-${i}`,
    center: { x, y: sy / 2, z },
    size: { x: sx, y: sy, z: sz },
    color: i % 2 === 0 ? "#3b82f6" : "#1e40af"
  }))
];

const blueprintBouncePads: ArenaBouncePad[] = [
  { id: "blueprint-bounce-central", center: { x: -3, y: 0.1, z: -18 }, radius: 2.7, height: 0.2, color: "#22d3ee", launchVelocity: 33 },
  { id: "blueprint-bounce-east", center: { x: 12, y: 0.1, z: 30 }, radius: 2.5, height: 0.2, color: "#38bdf8", launchVelocity: 32 },
  { id: "blueprint-bounce-west", center: { x: -48, y: 0.1, z: -18 }, radius: 2.5, height: 0.2, color: "#67e8f9", launchVelocity: 32 },
  { id: "blueprint-bounce-south", center: { x: 30, y: 0.1, z: -48 }, radius: 2.7, height: 0.2, color: "#22d3ee", launchVelocity: 33 }
];

const bankColors = {
  carpet: "#52616b",
  tile: "#d7d2c8",
  stairStone: "#c9c5bc",
  wallWood: "#a77248",
  wallStone: "#8f9699",
  glass: "#9bc1cf",
  deskWhite: "#e2ded4",
  cubicleFabric: "#9a9b99",
  counterWood: "#8c603f",
  brass: "#b08a48",
  garden: "#315533"
} as const;
const bankGroundStandY = 1.2;
const bankMezzanineStandY = 6.0;
const bankFloorThickness = 0.45;
const bankStairHeight = 0.5;

function bankLevelCenter(floorY: number, height: number) {
  return floorY + height / 2;
}

function bankBlock(id: string, x: number, z: number, width: number, depth: number, height: number, color: string, floorY = 0, climbable = false): ArenaCollider {
  return {
    id,
    center: { x, y: bankLevelCenter(floorY, height), z },
    size: { x: width, y: height, z: depth },
    color,
    climbable
  };
}

function bankWall(id: string, x: number, z: number, width: number, depth: number, floorY: number, color: string): ArenaCollider {
  return bankBlock(id, x, z, width, depth, 4.8, color, floorY);
}

function bankLintel(id: string, x: number, z: number, width: number, depth: number, floorY: number): ArenaCollider {
  return {
    id,
    center: { x, y: floorY + 4.175, z },
    size: { x: width, y: 1.25, z: depth },
    color: bankColors.wallStone
  };
}

function bankSurface(id: string, minX: number, maxX: number, minZ: number, maxZ: number, standY: number, color: string): ArenaCollider {
  return {
    id,
    center: { x: (minX + maxX) / 2, y: standY - 1.2 - bankFloorThickness / 2, z: (minZ + maxZ) / 2 },
    size: { x: maxX - minX, y: bankFloorThickness, z: maxZ - minZ },
    color,
    climbable: true
  };
}

function bankStairStep(id: string, x: number, z: number, width: number, depth: number, standY: number, color: string): ArenaCollider {
  const top = standY - 1.2;
  return {
    id,
    center: { x, y: top - bankStairHeight / 2, z },
    size: { x: width, y: bankStairHeight, z: depth },
    color,
    climbable: true
  };
}

function bankSurfaceColliders(floorName: string, standY: number, upper: boolean): ArenaCollider[] {
  const floorColor = (id: string, minX: number, maxX: number, minZ: number, maxZ: number, color: string) =>
    bankSurface(`bank-${floorName}-surface-${id}`, minX, maxX, minZ, maxZ, standY, color);
  return [
    floorColor("north-carpet", -41.3, 41.3, -41.3, -22.45, bankColors.carpet),
    floorColor("south-carpet", -41.3, 41.3, 22.45, 41.3, bankColors.carpet),
    floorColor("north-west-tile", -41.3, -22.1, -21.55, -16.53, bankColors.tile),
    floorColor("north-main-tile", -21.2, 41.3, -21.55, -16.53, bankColors.tile),
    floorColor("south-west-tile", -41.3, -22.1, 16.53, 21.55, bankColors.tile),
    floorColor("south-main-tile", -21.2, 41.3, 16.53, 21.55, bankColors.tile),
    floorColor("west-hall", -21.2, -8.35, -16.53, 16.53, bankColors.tile),
    floorColor("east-hall", 8.35, 21.55, -16.53, 16.53, bankColors.tile),
    floorColor("east-office", 22.45, 41.3, -16.53, 16.53, bankColors.carpet),
    floorColor("north-stair-pocket", -41.3, -22.1, -16.53, -9.2, bankColors.tile),
    floorColor("south-stair-pocket", -41.3, -22.1, 7.2, 16.53, bankColors.tile),
    ...(upper ? [] : [floorColor("lower-stair-opening", -39.5, -22.1, -8.3, 6.3, bankColors.tile)]),
    floorColor("north-threshold", -22.1, -21.2, -18.45, -15.05, bankColors.tile),
    floorColor("south-threshold", -22.1, -21.2, 15.05, 18.45, bankColors.tile),
    floorColor("stair-threshold-strip", -22.1, -21.2, -8.3, 6.3, bankColors.tile)
  ];
}

function bankWallColliders(floorName: string, floorY: number): ArenaCollider[] {
  const wall = (id: string, x: number, z: number, width: number, depth: number, color: string) =>
    bankWall(`bank-${floorName}-${id}`, x, z, width, depth, floorY, color);
  return [
    wall("exterior-north", 0, -42, 84, 1.4, bankColors.wallWood),
    wall("exterior-south", 0, 42, 84, 1.4, bankColors.wallWood),
    wall("exterior-west", -42, 0, 1.4, 84, bankColors.wallWood),
    wall("exterior-east", 42, 0, 1.4, 84, bankColors.wallWood),
    ...[
      ["ring-north-west-1", -33, -22, 10, 0.9],
      ["ring-north-west-2", -22.75, -22, 10.5, 0.9],
      ["ring-north-center", 0, -22, 25, 0.9],
      ["ring-north-east-1", 22.75, -22, 10.5, 0.9],
      ["ring-north-east-2", 33, -22, 10, 0.9],
      ["ring-south-west-1", -33, 22, 10, 0.9],
      ["ring-south-west-2", -22.75, 22, 10.5, 0.9],
      ["ring-south-center", 0, 22, 25, 0.9],
      ["ring-south-east-1", 22.75, 22, 10.5, 0.9],
      ["ring-south-east-2", 33, 22, 10, 0.9],
      ["ring-east-north", 22, -11.25, 0.9, 10.5],
      ["ring-east-center", 22, 0, 0.9, 12],
      ["ring-east-south", 22, 11.25, 0.9, 10.5]
    ].map(([id, x, z, width, depth]) => wall(id as string, x as number, z as number, width as number, depth as number, bankColors.wallWood)),
    wall("stair-north-wrap", -30.8, -8.75, 18.3, 0.9, bankColors.wallStone),
    wall("stair-south-wrap", -30.8, 6.75, 18.3, 0.9, bankColors.wallStone),
    wall("stair-back", -40.625, -1, 2.25, 14.6, bankColors.wallStone),
    ...[
      ["north-door-north-side", -20.225, 3.55],
      ["north-door-south-side", -11.675, 6.75],
      ["south-door-north-side", 10.675, 8.75],
      ["south-door-south-side", 20.225, 3.55]
    ].map(([id, z, depth]) => wall(id as string, -21.65, z as number, 0.9, depth as number, bankColors.wallStone)),
    bankLintel(`bank-${floorName}-north-door-lintel`, -21.65, -16.75, 0.9, 3.4, floorY),
    bankLintel(`bank-${floorName}-south-door-lintel`, -21.65, 16.75, 0.9, 3.4, floorY)
  ];
}

const bankStairColliders: ArenaCollider[] = [
  bankStairStep("bank-stair-upper-landing", -24.55, -6.5, 4.9, 3.54, 6.0, bankColors.tile),
  ...[
    [-27.95, -6.5, 2.78, 3.54, 5.6],
    [-30.5, -6.5, 2.48, 3.54, 5.2],
    [-32.9, -6.5, 2.48, 3.54, 4.8],
    [-35.3, -6.5, 2.48, 3.54, 4.4],
    [-37.7, -4.1, 3.54, 2.48, 4.0],
    [-37.7, -1.7, 3.54, 2.48, 3.6],
    [-37.7, 0.7, 3.54, 2.48, 3.2],
    [-37.7, 3.1, 3.54, 2.48, 2.8],
    [-35.3, 4.5, 2.48, 3.54, 2.4],
    [-32.9, 4.5, 2.48, 3.54, 2.0],
    [-30.5, 4.5, 2.48, 3.54, 1.6],
    [-28.1, 4.5, 2.48, 3.54, 1.28]
  ].map(([x, z, width, depth, standY], i) => bankStairStep(`bank-stair-tread-${i + 1}`, x, z, width, depth, standY, bankColors.stairStone)),
  bankStairStep("bank-stair-mid-landing-1", -37.7, -6.5, 3.54, 3.54, 4.4, bankColors.tile),
  bankStairStep("bank-stair-mid-landing-2", -37.7, 4.5, 3.54, 3.54, 2.8, bankColors.tile)
];

const bankAtriumColliders: ArenaCollider[] = [
  {
    id: "bank-atrium-garden-blocker",
    center: { x: 0, y: 2.8, z: 0 },
    size: { x: 11.2, y: 3.2, z: 11.2 },
    color: bankColors.garden
  },
  ...[0, 4.8].flatMap((floorY) => {
    const floorName = floorY === 0 ? "ground" : "upper";
    return [
      bankWall(`bank-${floorName}-atrium-glass-north`, 0, -16, 15.5, 0.7, floorY, bankColors.glass),
      bankWall(`bank-${floorName}-atrium-glass-south`, 0, 16, 15.5, 0.7, floorY, bankColors.glass),
      bankWall(`bank-${floorName}-atrium-glass-west`, -8, 0, 0.7, 31.5, floorY, bankColors.glass),
      bankWall(`bank-${floorName}-atrium-glass-east`, 8, 0, 0.7, 31.5, floorY, bankColors.glass)
    ];
  })
];

const bankFurnitureColliders: ArenaCollider[] = [
  ...[
    [0, [-36, -32, -28, 28, 32, 36]],
    [4.8, [-18, -14, -10, 28, 32, 36]]
  ].flatMap(([floorY, xs]) => (xs as number[]).map((x) => bankBlock(`bank-${floorY === 0 ? "ground" : "upper"}-cubicle-${x}`, x, -30, 1, 6, 1.6, bankColors.cubicleFabric, floorY as number))),
  ...[0, 4.8].flatMap((floorY) => {
    const floorName = floorY === 0 ? "ground" : "upper";
    return [
      bankBlock(`bank-${floorName}-teller-west`, -20, 26, 12, 1.1, 1.35, bankColors.counterWood, floorY),
      bankBlock(`bank-${floorName}-teller-center`, 0, 28, 14, 1.1, 1.35, bankColors.counterWood, floorY),
      bankBlock(`bank-${floorName}-teller-east`, 21, 24, 1.1, 12, 1.35, bankColors.counterWood, floorY),
      bankWall(`bank-${floorName}-vault-wall-south`, 33, 29, 10, 1.1, floorY, bankColors.brass),
      bankWall(`bank-${floorName}-vault-wall-west`, 27, 34, 1.1, 10, floorY, bankColors.brass),
      ...[-35, 35].flatMap((z) => [-36, -28, -20, -12, 12, 20, 28, 36].map((x) => bankBlock(`bank-${floorName}-desk-row-${x}-${z}`, x, z, 1, 1.8, 1.2, bankColors.deskWhite, floorY))),
      ...(floorY === 0 ? [
        ...[-14, 11, 14].map((z) => bankBlock(`bank-ground-west-side-desk-${z}`, -32, z, 4.8, 1, 1.2, bankColors.deskWhite, floorY))
      ] : []),
      ...[-8, 0, 8, 14].map((z) => bankBlock(`bank-${floorName}-east-side-desk-${z}`, 32, z, 4.8, 1, 1.2, bankColors.deskWhite, floorY))
    ];
  })
];

const bankColliders: ArenaCollider[] = [
  ...bankSurfaceColliders("ground", bankGroundStandY, false),
  ...bankSurfaceColliders("upper", bankMezzanineStandY, true),
  ...bankWallColliders("ground", 0),
  ...bankWallColliders("upper", 4.8),
  ...bankAtriumColliders,
  ...bankFurnitureColliders,
  ...bankStairColliders
];

export const ARENAS: Record<MapName, ArenaDefinition> = {
  Pyramid: {
    floorSize: 104,
    bounds: 50,
    playBounds: 44.55,
    floorColor: "#d8c38e",
    gridColor: "#b9995d",
    spawns: [
      { x: -38, y: 1.2, z: -38 }, { x: 38, y: 1.2, z: 38 }, { x: 38, y: 1.2, z: -38 }, { x: -38, y: 1.2, z: 38 },
      { x: 0, y: 1.2, z: -42 }, { x: 0, y: 1.2, z: 42 }, { x: -42, y: 1.2, z: 0 }, { x: 42, y: 1.2, z: 0 }
    ],
    colliders: pyramidColliders
  },
  "Practice Range": {
    floorSize: 140,
    bounds: 64,
    playBounds: 60.45,
    ceiling: 38,
    floorColor: "#d9e1e8",
    gridColor: "#a8b4c1",
    spawns: [
      { x: -42, y: 1.2, z: -18 }, { x: 42, y: 1.2, z: 18 }, { x: -18, y: 1.2, z: 42 }, { x: 18, y: 1.2, z: -42 },
      { x: -50, y: 22, z: -50 }, { x: 50, y: 22, z: 50 }, { x: 0, y: 28, z: 0 }, { x: 31, y: 8, z: 0 }
    ],
    colliders: practiceColliders,
    bouncePads: practiceBouncePads
  },
  Forest: {
    floorSize: 116,
    bounds: 54,
    ceiling: 20,
    floorColor: "#6fb44b",
    gridColor: "#4f8935",
    spawns: [
      { x: -44, y: 1.2, z: -38 }, { x: 42, y: 1.2, z: 38 }, { x: 28, y: 1.2, z: -42 }, { x: -38, y: 1.2, z: 34 },
      { x: 0, y: 3.95, z: 0 }, { x: -50, y: 1.2, z: 8 }, { x: 50, y: 1.2, z: -8 }, { x: 8, y: 1.2, z: 48 }
    ],
    colliders: forestColliders,
    trees: forestTrees,
    rocks: forestRocks
  },
  Subway: {
    floorSize: 124,
    bounds: 58,
    playBounds: 55.95,
    floorColor: "#2b2e33",
    gridColor: "#3f454b",
    spawns: [
      { x: 0, y: 8.2, z: 0 }, { x: 0, y: 8.2, z: 42 }, { x: 42, y: 8.2, z: 0 }, { x: -42, y: 8.2, z: 0 },
      { x: -16.5, y: 2.5, z: -45 }, { x: 16.5, y: 2.5, z: 45 }, { x: -2.8, y: 1.2, z: 8 }, { x: 2.8, y: 1.2, z: -8 }
    ],
    colliders: subwayColliders
  },
  Blueprint: {
    floorSize: 140,
    bounds: 62,
    playBounds: 54.45,
    ceiling: 34,
    floorColor: "#1d4ed8",
    gridColor: "#bae6fd",
    spawns: [
      { x: -52, y: 1.2, z: -52 }, { x: 52, y: 1.2, z: 52 }, { x: 52, y: 1.2, z: -12 }, { x: -8, y: 1.2, z: 52 },
      { x: -3, y: 1.2, z: -31 }, { x: 18, y: 7, z: -36 }, { x: 28, y: 14, z: 18 }, { x: -40, y: 21, z: 32 }
    ],
    colliders: blueprintColliders,
    bouncePads: blueprintBouncePads
  },
  "Bank Heist": {
    floorSize: 88,
    bounds: 43,
    playBounds: 42,
    occludeShots: true,
    floorColor: bankColors.carpet,
    gridColor: "#6f7d86",
    spawns: [
      { x: -31, y: 1.2, z: -34 }, { x: 31, y: 1.2, z: -34 }, { x: -31, y: 1.2, z: 34 }, { x: 31, y: 1.2, z: 34 },
      { x: -18, y: 1.2, z: 0 }, { x: 18, y: 1.2, z: 0 }, { x: 0, y: 1.2, z: -24 }, { x: 0, y: 1.2, z: 24 },
      { x: -18, y: bankMezzanineStandY, z: -34 }, { x: 31, y: bankMezzanineStandY, z: -34 }, { x: -31, y: bankMezzanineStandY, z: 34 }, { x: 31, y: bankMezzanineStandY, z: 34 },
      { x: -18, y: bankMezzanineStandY, z: 0 }, { x: 18, y: bankMezzanineStandY, z: 0 }, { x: 0, y: bankMezzanineStandY, z: -24 }, { x: 0, y: bankMezzanineStandY, z: 24 }
    ],
    colliders: bankColliders
  }
};

export function firstShotBlock(map: MapName, origin: Vec3, dir: Vec3, maxDist: number): number | null {
  let nearest: number | null = null;
  for (const collider of ARENAS[map].colliders) {
    if (collider.ladder) continue;

    const halfX = collider.size.x / 2;
    const halfY = collider.size.y / 2;
    const halfZ = collider.size.z / 2;
    const hit = rayAabbDistance(
      origin,
      dir,
      collider.center.x - halfX,
      collider.center.x + halfX,
      collider.center.y - halfY,
      collider.center.y + halfY,
      collider.center.z - halfZ,
      collider.center.z + halfZ
    );
    if (hit == null || hit < 1e-3 || hit > maxDist) continue;
    if (nearest == null || hit < nearest) nearest = hit;
  }
  return nearest;
}

export function resolvePlayerPosition(map: MapName, next: Vec3, previous?: Vec3): Vec3 {
  const arena = ARENAS[map];
  const ceiling = arena.ceiling ?? 12;
  const bounds = arena.playBounds ?? arena.bounds - PLAYER_RADIUS;
  const last = previous ?? next;
  const resolved = {
    x: clamp(next.x, -bounds, bounds),
    y: clamp(next.y, 1.2, ceiling),
    z: clamp(next.z, -bounds, bounds)
  };
  const lastGround = supportY(arena, last);
  let ground = supportY(arena, resolved, lastGround);
  resolved.y = Math.max(resolved.y, ground);
  for (const collider of arena.colliders) {
    if (!intersectsXZ(resolved, collider)) continue;
    if (collider.ladder) continue;
    const top = collider.center.y + collider.size.y / 2 + 1.2;
    const bottom = collider.center.y - collider.size.y / 2;
    const canStand = (collider.climbable && bottom <= lastGround + 0.95) || top - lastGround <= 0.95 || resolved.y >= top - 0.1;
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
    const previousDx = last.x - collider.center.x;
    const previousDz = last.z - collider.center.z;
    const overlapX = halfX - Math.abs(dx);
    const overlapZ = halfZ - Math.abs(dz);
    if (overlapX < overlapZ) {
      resolved.x += collisionDirection(dx, previousDx) * overlapX;
    } else {
      resolved.z += collisionDirection(dz, previousDz) * overlapZ;
    }
  }
  resolved.x = clamp(resolved.x, -bounds, bounds);
  resolved.z = clamp(resolved.z, -bounds, bounds);
  const finalGround = supportY(arena, resolved, ground);
  if (map === "Subway" && next.y <= last.y + 0.05 && resolved.y - finalGround <= 0.8) {
    resolved.y = finalGround;
  } else {
    resolved.y = Math.max(resolved.y, finalGround);
  }
  return resolved;
}

export function resolveGrenade(map: MapName, position: Vec3, velocity: Vec3): { position: Vec3; velocity: Vec3; collided: boolean } {
  const arena = ARENAS[map];
  const resolved = { ...position };
  const nextVelocity = { ...velocity };
  let collided = false;

  for (const collider of arena.colliders) {
    if (collider.ladder) continue;
    const minX = collider.center.x - collider.size.x / 2 - GRENADE_RADIUS;
    const maxX = collider.center.x + collider.size.x / 2 + GRENADE_RADIUS;
    const minY = collider.center.y - collider.size.y / 2 - GRENADE_RADIUS;
    const maxY = collider.center.y + collider.size.y / 2 + GRENADE_RADIUS;
    const minZ = collider.center.z - collider.size.z / 2 - GRENADE_RADIUS;
    const maxZ = collider.center.z + collider.size.z / 2 + GRENADE_RADIUS;
    if (resolved.x < minX || resolved.x > maxX || resolved.y < minY || resolved.y > maxY || resolved.z < minZ || resolved.z > maxZ) continue;

    const pushMinX = resolved.x - minX;
    const pushMaxX = maxX - resolved.x;
    const pushMinY = resolved.y - minY;
    const pushMaxY = maxY - resolved.y;
    const pushMinZ = resolved.z - minZ;
    const pushMaxZ = maxZ - resolved.z;
    const axis = [
      { key: "x", amount: pushMinX, direction: -1 },
      { key: "x", amount: pushMaxX, direction: 1 },
      { key: "y", amount: pushMinY, direction: -1 },
      { key: "y", amount: pushMaxY, direction: 1 },
      { key: "z", amount: pushMinZ, direction: -1 },
      { key: "z", amount: pushMaxZ, direction: 1 }
    ].sort((a, b) => a.amount - b.amount)[0];

    if (axis.key === "x") {
      resolved.x += axis.direction * axis.amount;
      nextVelocity.x = -nextVelocity.x * 0.6;
      nextVelocity.y *= 0.92;
      nextVelocity.z *= 0.92;
    } else if (axis.key === "y") {
      resolved.y += axis.direction * axis.amount;
      nextVelocity.y = (axis.direction > 0 ? Math.abs(nextVelocity.y) : -Math.abs(nextVelocity.y)) * 0.42;
      nextVelocity.x *= 0.72;
      nextVelocity.z *= 0.72;
    } else {
      resolved.z += axis.direction * axis.amount;
      nextVelocity.z = -nextVelocity.z * 0.6;
      nextVelocity.x *= 0.92;
      nextVelocity.y *= 0.92;
    }
    collided = true;
  }

  if (resolved.y < 1.2) {
    resolved.y = 1.2;
    if (nextVelocity.y < 0) nextVelocity.y = Math.abs(nextVelocity.y) * 0.42;
    nextVelocity.x *= 0.72;
    nextVelocity.z *= 0.72;
    collided = true;
  }
  if (resolved.x < -arena.bounds + GRENADE_RADIUS || resolved.x > arena.bounds - GRENADE_RADIUS) {
    resolved.x = clamp(resolved.x, -arena.bounds + GRENADE_RADIUS, arena.bounds - GRENADE_RADIUS);
    nextVelocity.x = -nextVelocity.x * 0.6;
    nextVelocity.y *= 0.92;
    nextVelocity.z *= 0.92;
    collided = true;
  }
  if (resolved.z < -arena.bounds + GRENADE_RADIUS || resolved.z > arena.bounds - GRENADE_RADIUS) {
    resolved.z = clamp(resolved.z, -arena.bounds + GRENADE_RADIUS, arena.bounds - GRENADE_RADIUS);
    nextVelocity.z = -nextVelocity.z * 0.6;
    nextVelocity.x *= 0.92;
    nextVelocity.y *= 0.92;
    collided = true;
  }

  return { position: resolved, velocity: nextVelocity, collided };
}

function supportY(arena: ArenaDefinition, pos: Vec3, previousGround = 1.2) {
  let y = 1.2;
  for (const collider of arena.colliders) {
    if (collider.ladder) continue;
    if (!intersectsXZ(pos, collider)) continue;
    const top = collider.center.y + collider.size.y / 2 + 1.2;
    const bottom = collider.center.y - collider.size.y / 2;
    if ((collider.climbable && bottom <= previousGround + 0.95) || top - previousGround <= 0.95 || pos.y >= top - 0.25) y = Math.max(y, top);
  }
  return y;
}

export function ladderAt(map: MapName, pos: Vec3): LadderContact | null {
  const collider = ARENAS[map].colliders.find((candidate) => candidate.ladder && intersectsXZ(pos, candidate));
  if (!collider) return null;
  const bottomY = collider.center.y - collider.size.y / 2 + 1.2;
  const topY = collider.center.y + collider.size.y / 2 + 1.2;
  if (pos.y < bottomY - 0.2 || pos.y > topY + 0.35) return null;
  const normal = ladderNormal(collider);
  return { topY, bottomY, exit: ladderExit(collider, topY, normal), mount: ladderMount(collider, normal), normal };
}

export function bouncePadAt(map: MapName, pos: Vec3): ArenaBouncePad | null {
  return ARENAS[map].bouncePads?.find((pad) => {
    if (pos.y > pad.center.y + 1.35) return false;
    const dx = pos.x - pad.center.x;
    const dz = pos.z - pad.center.z;
    return dx * dx + dz * dz <= pad.radius * pad.radius;
  }) ?? null;
}

function ladderNormal(collider: ArenaCollider) {
  return collider.ladderNormal ?? { x: 0, z: Math.sign(collider.center.z) || 1 };
}

function ladderExit(collider: ArenaCollider, topY: number, normal = ladderNormal(collider)): Vec3 {
  return { x: collider.center.x - normal.x * 2.65, y: topY, z: collider.center.z - normal.z * 2.65 };
}

function ladderMount(collider: ArenaCollider, normal = ladderNormal(collider)): Vec3 {
  return { x: collider.center.x + normal.x * 0.85, y: collider.center.y, z: collider.center.z + normal.z * 0.85 };
}

function intersectsXZ(pos: Vec3, collider: ArenaCollider) {
  return Math.abs(pos.x - collider.center.x) < collider.size.x / 2 + PLAYER_RADIUS && Math.abs(pos.z - collider.center.z) < collider.size.z / 2 + PLAYER_RADIUS;
}

function rayAabbDistance(origin: Vec3, dir: Vec3, minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number): number | null {
  let tMin = -Infinity;
  let tMax = Infinity;

  const x = slab(origin.x, dir.x, minX, maxX, tMin, tMax);
  if (!x) return null;
  tMin = x.tMin;
  tMax = x.tMax;

  const y = slab(origin.y, dir.y, minY, maxY, tMin, tMax);
  if (!y) return null;
  tMin = y.tMin;
  tMax = y.tMax;

  const z = slab(origin.z, dir.z, minZ, maxZ, tMin, tMax);
  if (!z) return null;
  tMin = z.tMin;
  tMax = z.tMax;

  if (tMax < 0) return null;
  return tMin >= 0 ? tMin : tMax;
}

function slab(origin: number, dir: number, min: number, max: number, tMin: number, tMax: number): { tMin: number; tMax: number } | null {
  if (Math.abs(dir) < 1e-8) return origin >= min && origin <= max ? { tMin, tMax } : null;
  const inv = 1 / dir;
  let near = (min - origin) * inv;
  let far = (max - origin) * inv;
  if (near > far) {
    const temp = near;
    near = far;
    far = temp;
  }
  const nextMin = Math.max(tMin, near);
  const nextMax = Math.min(tMax, far);
  return nextMin <= nextMax ? { tMin: nextMin, tMax: nextMax } : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function collisionDirection(delta: number, previousDelta: number) {
  if (previousDelta !== 0) return previousDelta > 0 ? 1 : -1;
  return delta >= 0 ? 1 : -1;
}

export type ClientToServerEvents = {
  hello: (payload: { playerId: string; name: string; glToken?: string }) => void;
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
