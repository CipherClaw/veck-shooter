import { v4 as uuid } from "uuid";
import {
  MAPS,
  MAX_PLAYERS,
  PLAYER_RADIUS,
  WEAPONS,
  type ChatMessage,
  type ClientInput,
  type FirePayload,
  type GameMode,
  type GameSnapshot,
  type GameSummary,
  type MapName,
  type PlayerSnapshot,
  type Vec3,
  type WeaponId
} from "@veck/shared";
import { canDamage, distance, nextTeam, rayPointDistance, validateJoin, weaponDamage, winner } from "./rules.js";
import { cleanText } from "./filter.js";
import type { StatsStore } from "./store.js";

type RuntimePlayer = PlayerSnapshot & {
  socketId: string;
  lastFire: Record<WeaponId, number>;
  ammo: Record<WeaponId, number>;
  lastChat: number;
};

type RuntimeGame = {
  id: string;
  map: MapName;
  mode: GameMode;
  durationMinutes: number;
  status: "waiting" | "active" | "ended";
  createdAt: number;
  startedAt: number;
  endsAt: number;
  players: Map<string, RuntimePlayer>;
  chat: ChatMessage[];
  killFeed: string[];
  winner?: string;
};

const spawnPoints: Record<MapName, Vec3[]> = {
  Pyramid: [
    { x: -17, y: 1.2, z: -17 },
    { x: 17, y: 1.2, z: 17 },
    { x: 17, y: 1.2, z: -17 },
    { x: -17, y: 1.2, z: 17 },
    { x: 0, y: 1.2, z: -22 },
    { x: 0, y: 1.2, z: 22 },
    { x: -22, y: 1.2, z: 0 },
    { x: 22, y: 1.2, z: 0 }
  ],
  "Practice Range": [
    { x: -24, y: 1.2, z: -10 },
    { x: 24, y: 1.2, z: 10 },
    { x: -8, y: 5.2, z: 20 },
    { x: 8, y: 5.2, z: -20 },
    { x: -26, y: 1.2, z: 22 },
    { x: 26, y: 1.2, z: -22 },
    { x: 0, y: 7.2, z: 0 },
    { x: 0, y: 1.2, z: 26 }
  ],
  Forest: [
    { x: -22, y: 1.2, z: -18 },
    { x: 20, y: 1.2, z: 18 },
    { x: 14, y: 1.2, z: -20 },
    { x: -18, y: 1.2, z: 16 },
    { x: 0, y: 2.8, z: 0 },
    { x: -26, y: 1.2, z: 4 },
    { x: 26, y: 1.2, z: -4 },
    { x: 4, y: 1.2, z: 25 }
  ]
};

export class GameHub {
  private games = new Map<string, RuntimeGame>();
  private playerNames = new Map<string, string>();

  constructor(private stats: StatsStore) {}

  hello(playerId: string, name: string) {
    this.playerNames.set(playerId, name);
    return this.stats.ensure(playerId, name);
  }

  summaries(): GameSummary[] {
    return [...this.games.values()].map((game) => this.summary(game));
  }

  create(playerId: string, socketId: string, opts: { map: MapName; mode: GameMode; durationMinutes: number; weapon: WeaponId }) {
    const map = MAPS.includes(opts.map) ? opts.map : "Pyramid";
    const now = Date.now();
    const game: RuntimeGame = {
      id: uuid().slice(0, 8),
      map,
      mode: opts.mode,
      durationMinutes: opts.durationMinutes,
      status: "active",
      createdAt: now,
      startedAt: now,
      endsAt: now + opts.durationMinutes * 60_000,
      players: new Map(),
      chat: [],
      killFeed: [],
    };
    this.games.set(game.id, game);
    this.join(playerId, socketId, game.id, opts.weapon);
    return game.id;
  }

  join(playerId: string, socketId: string, gameId: string, weapon: WeaponId): { ok: true; gameId: string } | { ok: false; reason: string } {
    const game = this.games.get(gameId);
    if (!game || game.status === "ended") return { ok: false, reason: "That match is no longer available." };
    const full = validateJoin(game.players.size);
    if (full && !game.players.has(playerId)) return { ok: false, reason: full };
    const name = this.playerNames.get(playerId) ?? "Guest";
    const spawn = spawnPoints[game.map][game.players.size % spawnPoints[game.map].length];
    const player: RuntimePlayer = {
      id: playerId,
      socketId,
      name,
      team: nextTeam([...game.players.values()], game.mode),
      position: { ...spawn },
      rotationY: 0,
      health: 100,
      alive: true,
      weapon,
      kills: 0,
      deaths: 0,
      score: 0,
      lastFire: { revolver: 0, sniper: 0, grenade: 0, shottie: 0, watergun: 0 },
      ammo: { revolver: 6, sniper: 4, grenade: 2, shottie: 3, watergun: 100 },
      lastChat: 0
    };
    game.players.set(playerId, player);
    return { ok: true, gameId };
  }

  leave(playerId: string) {
    for (const game of this.games.values()) {
      game.players.delete(playerId);
      if (game.players.size === 0) this.games.delete(game.id);
    }
  }

  input(playerId: string, input: ClientInput) {
    const player = this.findPlayer(playerId);
    if (!player || !player.alive) return;
    player.position = clampPosition(input.position);
    player.rotationY = input.rotationY;
    player.weapon = input.weapon;
  }

  fire(playerId: string, payload: FirePayload) {
    const found = this.find(playerId);
    if (!found) return null;
    const { game, player } = found;
    if (!player.alive || payload.weapon !== player.weapon) return null;
    const spec = WEAPONS[payload.weapon];
    const now = Date.now();
    if (now - player.lastFire[payload.weapon] < spec.fireMs) return null;
    if (player.ammo[payload.weapon] <= 0) return null;
    player.lastFire[payload.weapon] = now;
    player.ammo[payload.weapon] -= payload.weapon === "watergun" ? 2 : 1;

    const dir = normalize(payload.direction);
    let fxTo = add(payload.origin, scale(dir, spec.range));
    let hitPoint: Vec3 | undefined;

    if (payload.weapon === "grenade") {
      hitPoint = add(payload.origin, scale(dir, 12));
      fxTo = hitPoint;
      for (const victim of game.players.values()) {
        if (!canDamage(player, victim, game.mode)) continue;
        const dist = distance(victim.position, hitPoint);
        if (dist < 8) this.damage(game, player, victim, weaponDamage(payload.weapon, dist));
      }
      return { from: payload.origin, to: fxTo, weapon: payload.weapon, explosion: hitPoint };
    }

    const candidates = [...game.players.values()]
      .filter((victim) => canDamage(player, victim, game.mode))
      .map((victim) => ({ victim, ray: rayPointDistance(payload.origin, dir, victim.position) }))
      .filter(({ ray }) => ray.along > 0 && ray.along < spec.range && ray.distance < PLAYER_RADIUS + (payload.weapon === "shottie" ? 1.0 : 0.35))
      .sort((a, b) => a.ray.along - b.ray.along);
    const hit = candidates[0];
    if (hit) {
      fxTo = add(payload.origin, scale(dir, hit.ray.along));
      hitPoint = fxTo;
      const total = payload.weapon === "shottie" ? weaponDamage(payload.weapon, hit.ray.along) * Math.ceil(spec.pellets * 0.5) : weaponDamage(payload.weapon, hit.ray.along);
      this.damage(game, player, hit.victim, total);
    }
    return { from: payload.origin, to: fxTo, weapon: payload.weapon, hit: hitPoint };
  }

  reload(playerId: string, weapon: WeaponId) {
    const player = this.findPlayer(playerId);
    if (player) player.ammo[weapon] = WEAPONS[weapon].ammo;
  }

  respawn(playerId: string, weapon: WeaponId) {
    const found = this.find(playerId);
    if (!found) return;
    const { game, player } = found;
    if (player.alive || (player.respawnAt && Date.now() < player.respawnAt)) return;
    const spawn = spawnPoints[game.map][Math.floor(Math.random() * spawnPoints[game.map].length)];
    player.position = { ...spawn };
    player.health = 100;
    player.weapon = weapon;
    player.alive = true;
    player.respawnAt = undefined;
    player.ammo[weapon] = WEAPONS[weapon].ammo;
  }

  chat(playerId: string, scope: "lobby" | "game", text: string, gameId?: string): ChatMessage | null {
    const now = Date.now();
    const found = this.find(playerId);
    const ratePlayer = found?.player;
    if (ratePlayer && now - ratePlayer.lastChat < 800) return null;
    if (ratePlayer) ratePlayer.lastChat = now;
    const msg: ChatMessage = {
      id: uuid(),
      scope,
      gameId,
      playerId,
      name: this.playerNames.get(playerId) ?? "Guest",
      text: cleanText(text),
      at: now
    };
    if (scope === "game" && gameId) {
      const game = this.games.get(gameId);
      if (!game) return null;
      game.chat = [...game.chat.slice(-34), msg];
    }
    return msg.text ? msg : null;
  }

  tick(): GameSnapshot[] {
    const now = Date.now();
    const snapshots: GameSnapshot[] = [];
    for (const game of this.games.values()) {
      if (game.status === "active" && now >= game.endsAt) this.endGame(game);
      snapshots.push({ game: this.summary(game), players: [...game.players.values()].map(stripRuntime), killFeed: game.killFeed, winner: game.winner });
      if (game.status === "ended" && game.players.size === 0) this.games.delete(game.id);
    }
    return snapshots;
  }

  gameChat(gameId: string): ChatMessage[] {
    return this.games.get(gameId)?.chat ?? [];
  }

  private damage(game: RuntimeGame, attacker: RuntimePlayer, victim: RuntimePlayer, amount: number) {
    victim.health = Math.max(0, victim.health - amount);
    if (victim.health > 0) return;
    victim.alive = false;
    victim.deaths += 1;
    victim.respawnAt = Date.now() + 1800;
    attacker.kills += 1;
    attacker.score = attacker.kills;
    game.killFeed = [`${attacker.name} eliminated ${victim.name}`, ...game.killFeed].slice(0, 6);
    this.stats.add(attacker.id, { kills: 1 });
    this.stats.add(victim.id, { deaths: 1 });
  }

  private endGame(game: RuntimeGame) {
    game.status = "ended";
    game.winner = winner([...game.players.values()], game.mode);
    for (const player of game.players.values()) {
      const won = game.mode === "Team Mode" ? `${player.team === "red" ? "Red" : "Green"} Team` === game.winner : player.name === game.winner;
      this.stats.add(player.id, { wins: won ? 1 : 0, gamesPlayed: 1, coins: won ? 25 : 10 });
    }
  }

  private summary(game: RuntimeGame): GameSummary {
    return {
      id: game.id,
      map: game.map,
      mode: game.mode,
      durationMinutes: game.durationMinutes,
      status: game.status,
      playerCount: game.players.size,
      maxPlayers: MAX_PLAYERS,
      timeRemainingMs: Math.max(0, game.endsAt - Date.now()),
      createdAt: game.createdAt
    };
  }

  private find(playerId: string) {
    for (const game of this.games.values()) {
      const player = game.players.get(playerId);
      if (player) return { game, player };
    }
    return null;
  }

  private findPlayer(playerId: string) {
    return this.find(playerId)?.player;
  }
}

function stripRuntime(player: RuntimePlayer): PlayerSnapshot {
  const { socketId: _socketId, lastFire: _lastFire, ammo: _ammo, lastChat: _lastChat, ...snapshot } = player;
  return snapshot;
}

function clampPosition(pos: Vec3): Vec3 {
  return { x: Math.max(-34, Math.min(34, pos.x)), y: Math.max(1.1, Math.min(12, pos.y)), z: Math.max(-34, Math.min(34, pos.z)) };
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function scale(v: Vec3, n: number): Vec3 {
  return { x: v.x * n, y: v.y * n, z: v.z * n };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
