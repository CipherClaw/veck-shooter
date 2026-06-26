import { v4 as uuid } from "uuid";
import {
  ARENAS,
  HEALTH_PACK_HEAL,
  HEALTH_PACK_PICKUP_RADIUS,
  HEALTH_PACK_RESPAWN_MS,
  MAPS,
  MAX_HEALTH_PACKS,
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
  type PlayerStats,
  type Vec3,
  type WeaponId,
  resolveGrenade,
  resolvePlayerPosition
} from "@veck/shared";
import { canDamage, distance, gunGameWeapon, nextTeam, rayPointDistance, validateJoin, weaponDamage, winner } from "./rules.js";
import { cleanText } from "./filter.js";
import type { StatsStore } from "./store.js";
import type { ProfileHub } from "./profile.js";

type RuntimePlayer = PlayerSnapshot & {
  socketId: string;
  lastFire: Record<WeaponId, number>;
  lastChat: number;
};

type RuntimeGrenade = {
  id: string;
  ownerId: string;
  position: Vec3;
  velocity: Vec3;
  explodeAt: number;
  bounces: number;
};

type RuntimeExplosion = {
  id: string;
  position: Vec3;
  createdAt: number;
  radius: number;
};

type RuntimeHealthPack = {
  id: string;
  position: Vec3;
};

type DamageEvent = {
  attackerSocketId: string;
  damage: number;
  killed?: string;
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
  grenades: RuntimeGrenade[];
  explosions: RuntimeExplosion[];
  healthPacks: RuntimeHealthPack[];
  nextHealthPackAt: number;
  damageEvents: DamageEvent[];
  chat: ChatMessage[];
  killFeed: string[];
  winner?: string;
  endedAt?: number;
  returnToLobbyAt?: number;
};

export class GameHub {
  private games = new Map<string, RuntimeGame>();
  private playerNames = new Map<string, string>();
  // greglab-games hub integration: map veck playerId -> canonical hub id, the
  // shared wallet balance, and a queue of post-game stats to push to clients.
  private hubIdByPlayer = new Map<string, string>();
  private hubCoins = new Map<string, number>();
  private statsEmits: { socketId: string; stats: PlayerStats }[] = [];

  constructor(private stats: StatsStore, private profile: ProfileHub | null = null) {}

  hello(playerId: string, name: string) {
    this.playerNames.set(playerId, name);
    return this.statsForPlayer(playerId, name);
  }

  // Link a hub-resolved profile to a local veck playerId (called from the hello path).
  linkHub(playerId: string, hubId: string, coins: number) {
    this.hubIdByPlayer.set(playerId, hubId);
    this.hubCoins.set(playerId, coins);
  }

  // Local SQLite stats, but with coins overridden by the shared hub wallet when linked.
  statsForPlayer(playerId: string, name?: string): PlayerStats {
    const base = name !== undefined ? this.stats.ensure(playerId, name) : this.stats.get(playerId);
    const coins = this.hubCoins.get(playerId);
    return coins != null ? { ...base, coins } : base;
  }

  // Drained by the server tick loop to emit refreshed stats after each game.
  drainStatsEmits() {
    const out = this.statsEmits;
    this.statsEmits = [];
    return out;
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
      grenades: [],
      explosions: [],
      healthPacks: [],
      nextHealthPackAt: now,
      damageEvents: [],
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
    const spawn = ARENAS[game.map].spawns[game.players.size % ARENAS[game.map].spawns.length];
    const player: RuntimePlayer = {
      id: playerId,
      socketId,
      name,
      team: nextTeam([...game.players.values()], game.mode),
      position: { ...spawn },
      rotationY: 0,
      health: 100,
      alive: true,
      weapon: game.mode === "Gun Game" ? gunGameWeapon(0) : weapon,
      kills: 0,
      deaths: 0,
      score: 0,
      lastFire: { revolver: 0, sniper: 0, grenade: 0, shottie: 0, watergun: 0 },
      ammo: fullAmmo(),
      reloadingWeapon: undefined,
      reloadingUntil: undefined,
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
    const found = this.find(playerId);
    if (!found || !found.player.alive) return;
    const { game, player } = found;
    if (game.status !== "active") return;
    player.position = resolvePlayerPosition(game.map, input.position, player.position);
    player.rotationY = input.rotationY;
    player.weapon = game.mode === "Gun Game" ? gunGameWeapon(player.kills) : input.weapon;
  }

  fire(playerId: string, payload: FirePayload) {
    const found = this.find(playerId);
    if (!found) return null;
    const { game, player } = found;
    if (game.status !== "active") return null;
    const weapon = game.mode === "Gun Game" ? gunGameWeapon(player.kills) : payload.weapon;
    if (!player.alive || (game.mode !== "Gun Game" && weapon !== player.weapon)) return null;
    player.weapon = weapon;
    const spec = WEAPONS[weapon];
    const now = Date.now();
    if (player.reloadingWeapon === weapon && player.reloadingUntil && now < player.reloadingUntil) return null;
    if (player.reloadingWeapon === weapon && player.reloadingUntil && now >= player.reloadingUntil) {
      player.ammo[player.reloadingWeapon] = WEAPONS[player.reloadingWeapon].ammo;
      player.reloadingWeapon = undefined;
      player.reloadingUntil = undefined;
    }
    if (now - player.lastFire[weapon] < spec.fireMs) return null;
    const ammoCost = weapon === "watergun" ? 2 : 1;
    if (player.ammo[weapon] < ammoCost) return null;
    player.lastFire[weapon] = now;
    player.ammo[weapon] = Math.max(0, player.ammo[weapon] - ammoCost);
    if (player.ammo[weapon] < ammoCost && player.reloadingWeapon !== weapon) {
      player.reloadingWeapon = weapon;
      player.reloadingUntil = now + spec.reloadMs;
    }

    const dir = normalize(payload.direction);
    let fxTo = add(payload.origin, scale(dir, spec.range));
    let hitPoint: Vec3 | undefined;

    if (weapon === "grenade") {
      game.grenades.push({
        id: uuid().slice(0, 8),
        ownerId: player.id,
        position: { ...payload.origin },
        velocity: add(scale(dir, 26), { x: 0, y: 9, z: 0 }),
        explodeAt: now + 1800,
        bounces: 0
      });
      return null;
    }

    const candidates = [...game.players.values()]
      .filter((victim) => canDamage(player, victim, game.mode))
      .map((victim) => ({ victim, ray: rayPointDistance(payload.origin, dir, victim.position) }))
      .filter(({ ray }) => ray.along > 0 && ray.along < spec.range && ray.distance < PLAYER_RADIUS + (weapon === "shottie" ? 1.0 : 0.35))
      .sort((a, b) => a.ray.along - b.ray.along);
    const hit = candidates[0];
    if (hit) {
      fxTo = add(payload.origin, scale(dir, hit.ray.along));
      hitPoint = fxTo;
      const total = weapon === "shottie" ? weaponDamage(weapon, hit.ray.along) * Math.ceil(spec.pellets * 0.5) : weaponDamage(weapon, hit.ray.along);
      this.damage(game, player, hit.victim, total);
    }
    return { shooterId: player.id, from: payload.origin, to: fxTo, weapon, hit: hitPoint };
  }

  reload(playerId: string, weapon: WeaponId) {
    const found = this.find(playerId);
    if (!found || found.game.status !== "active") return;
    const player = found.player;
    if (!player || player.ammo[weapon] >= WEAPONS[weapon].ammo) return;
    player.reloadingWeapon = weapon;
    player.reloadingUntil = Date.now() + WEAPONS[weapon].reloadMs;
  }

  respawn(playerId: string, weapon: WeaponId) {
    const found = this.find(playerId);
    if (!found) return;
    const { game, player } = found;
    if (game.status !== "active") return;
    if (player.alive || (player.respawnAt && Date.now() < player.respawnAt)) return;
    const spawn = ARENAS[game.map].spawns[Math.floor(Math.random() * ARENAS[game.map].spawns.length)];
    player.position = { ...spawn };
    player.health = 100;
    player.weapon = game.mode === "Gun Game" ? gunGameWeapon(player.kills) : weapon;
    player.alive = true;
    player.respawnAt = undefined;
    player.ammo = fullAmmo();
    player.reloadingWeapon = undefined;
    player.reloadingUntil = undefined;
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
      this.updateReloads(game, now);
      if (game.status === "active") {
        this.updateGrenades(game, now);
        this.updateHealthPacks(game, now);
      }
      game.explosions = game.explosions.filter((explosion) => now - explosion.createdAt < 650);
      snapshots.push({
        game: this.summary(game),
        players: [...game.players.values()].map(stripRuntime),
        grenades: game.grenades.map(({ id, ownerId, position, velocity, explodeAt }) => ({ id, ownerId, position, velocity, explodeAt })),
        explosions: game.explosions,
        healthPacks: game.healthPacks.map(({ id, position }) => ({ id, position })),
        killFeed: game.killFeed,
        winner: game.winner
      });
      if (game.status === "ended" && game.players.size === 0) this.games.delete(game.id);
    }
    return snapshots;
  }

  gameChat(gameId: string): ChatMessage[] {
    return this.games.get(gameId)?.chat ?? [];
  }

  drainDamageEvents(gameId: string): DamageEvent[] {
    const game = this.games.get(gameId);
    if (!game) return [];
    const events = game.damageEvents;
    game.damageEvents = [];
    return events;
  }

  private damage(game: RuntimeGame, attacker: RuntimePlayer, victim: RuntimePlayer, amount: number) {
    const damage = Math.max(0, Math.round(amount));
    if (damage <= 0) return;
    victim.health = Math.max(0, victim.health - damage);
    game.damageEvents.push({ attackerSocketId: attacker.socketId, damage, killed: victim.health <= 0 ? victim.name : undefined });
    if (victim.health > 0) return;
    victim.alive = false;
    victim.deaths += 1;
    victim.respawnAt = Date.now() + 1800;
    attacker.kills += 1;
    attacker.score = attacker.kills;
    if (game.mode === "Gun Game") {
      const newWeapon = gunGameWeapon(attacker.kills);
      attacker.weapon = newWeapon;
      attacker.ammo[newWeapon] = WEAPONS[newWeapon].ammo;
      if (attacker.reloadingWeapon !== newWeapon) {
        attacker.reloadingWeapon = undefined;
        attacker.reloadingUntil = undefined;
      }
    }
    game.killFeed = [`${attacker.name} eliminated ${victim.name}`, ...game.killFeed].slice(0, 6);
    this.stats.add(attacker.id, { kills: 1 });
    this.stats.add(victim.id, { deaths: 1 });
  }

  private endGame(game: RuntimeGame) {
    game.status = "ended";
    game.endedAt = Date.now();
    game.returnToLobbyAt = game.endedAt + 13_000;
    game.winner = winner([...game.players.values()], game.mode);
    game.grenades = [];
    const isSolo = game.players.size < 2;
    for (const player of game.players.values()) {
      const won = !isSolo && (game.mode === "Team Mode" ? `${player.team === "red" ? "Red" : "Green"} Team` === game.winner : player.name === game.winner);
      const coins = won ? 25 : 10;
      const earnedCoins = isSolo ? 0 : coins;
      const localStats = this.stats.add(player.id, { wins: won ? 1 : 0, gamesPlayed: 1, coins: earnedCoins });
      const hubId = this.hubIdByPlayer.get(player.id);
      const socketId = player.socketId;
      if (this.profile && hubId) {
        // Report this game's aggregate to the shared profile; emit refreshed
        // stats (with the shared wallet balance) once the hub confirms.
        this.profile
          .report(hubId, {
            coinsDelta: earnedCoins,
            statsDelta: { kills: player.kills, deaths: player.deaths, wins: won ? 1 : 0 },
            gamesPlayedDelta: 1,
            reason: won ? "won round" : "round end"
          })
          .then((result) => {
            if (result) {
              this.hubCoins.set(player.id, result.coins);
              this.statsEmits.push({ socketId, stats: { ...localStats, coins: result.coins } });
            } else {
              this.statsEmits.push({ socketId, stats: this.statsForPlayer(player.id) });
            }
          });
      } else {
        this.statsEmits.push({ socketId, stats: localStats });
      }
    }
  }

  private updateReloads(game: RuntimeGame, now: number) {
    for (const player of game.players.values()) {
      if (!player.reloadingUntil || now < player.reloadingUntil) continue;
      const weapon = player.reloadingWeapon ?? player.weapon;
      player.ammo[weapon] = WEAPONS[weapon].ammo;
      player.reloadingWeapon = undefined;
      player.reloadingUntil = undefined;
    }
  }

  private updateGrenades(game: RuntimeGame, now: number) {
    const dt = 1 / 20;
    const active: RuntimeGrenade[] = [];
    for (const grenade of game.grenades) {
      grenade.velocity.y -= 18 * dt;
      grenade.position = add(grenade.position, scale(grenade.velocity, dt));
      const resolved = resolveGrenade(game.map, grenade.position, grenade.velocity);
      grenade.position = resolved.position;
      grenade.velocity = resolved.velocity;
      if (resolved.collided) {
        grenade.bounces += 1;
      }
      const out = Math.abs(grenade.position.x) > ARENAS[game.map].bounds || Math.abs(grenade.position.z) > ARENAS[game.map].bounds;
      if (now >= grenade.explodeAt || grenade.bounces > 5 || out) {
        this.explodeGrenade(game, grenade);
      } else {
        active.push(grenade);
      }
    }
    game.grenades = active;
  }

  private updateHealthPacks(game: RuntimeGame, now: number) {
    if (game.healthPacks.length < MAX_HEALTH_PACKS && now >= game.nextHealthPackAt) {
      const pack = this.randomHealthPack(game);
      if (pack) {
        game.healthPacks.push(pack);
        game.nextHealthPackAt = now + HEALTH_PACK_RESPAWN_MS;
      }
    }

    const remaining: RuntimeHealthPack[] = [];
    let pickedUp = false;
    for (const pack of game.healthPacks) {
      const player = [...game.players.values()].find((candidate) => (
        candidate.alive &&
        candidate.health < 100 &&
        distance(candidate.position, pack.position) <= HEALTH_PACK_PICKUP_RADIUS + PLAYER_RADIUS
      ));
      if (!player) {
        remaining.push(pack);
        continue;
      }
      player.health = Math.min(100, player.health + HEALTH_PACK_HEAL);
      pickedUp = true;
    }
    game.healthPacks = remaining;
    if (pickedUp) game.nextHealthPackAt = Math.max(game.nextHealthPackAt, now + HEALTH_PACK_RESPAWN_MS);
  }

  private randomHealthPack(game: RuntimeGame): RuntimeHealthPack | null {
    const arena = ARENAS[game.map];
    for (let i = 0; i < 12; i += 1) {
      const x = randomBetween(-arena.bounds + 4, arena.bounds - 4);
      const z = randomBetween(-arena.bounds + 4, arena.bounds - 4);
      const resolved = resolvePlayerPosition(game.map, { x, y: 1.2, z }, { x, y: 1.2, z });
      if (resolved.y <= 1.6) return { id: uuid().slice(0, 8), position: resolved };
    }
    return null;
  }

  private explodeGrenade(game: RuntimeGame, grenade: RuntimeGrenade) {
    const attacker = game.players.get(grenade.ownerId);
    if (attacker) {
      for (const victim of game.players.values()) {
        if (!canDamage(attacker, victim, game.mode)) continue;
        const dist = distance(victim.position, grenade.position);
        if (dist <= WEAPONS.grenade.range) this.damage(game, attacker, victim, weaponDamage("grenade", dist));
      }
    }
    if (process.env.NODE_ENV === "development" || process.env.GRENADE_DEBUG === "1") {
      const affected = [...game.players.values()]
        .map((player) => ({ player, dist: distance(player.position, grenade.position) }))
        .filter(({ player, dist }) => attacker && canDamage(attacker, player, game.mode) && dist <= WEAPONS.grenade.range)
        .map(({ player, dist }) => `${player.name}:${dist.toFixed(1)}u/${weaponDamage("grenade", dist)}d`);
      console.info(`[grenade] game=${game.id} pos=${grenade.position.x.toFixed(1)},${grenade.position.y.toFixed(1)},${grenade.position.z.toFixed(1)} affected=${affected.join(",") || "none"}`);
    }
    game.explosions.push({ id: grenade.id, position: { ...grenade.position }, createdAt: Date.now(), radius: WEAPONS.grenade.range });
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
      createdAt: game.createdAt,
      endedAt: game.endedAt,
      returnToLobbyAt: game.returnToLobbyAt
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
  const { socketId: _socketId, lastFire: _lastFire, lastChat: _lastChat, ...snapshot } = player;
  return snapshot;
}

function fullAmmo(): Record<WeaponId, number> {
  return Object.fromEntries(Object.entries(WEAPONS).map(([id, spec]) => [id, spec.ammo])) as Record<WeaponId, number>;
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

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}
