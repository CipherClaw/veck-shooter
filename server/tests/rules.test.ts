import { describe, expect, it } from "vitest";
import { GameHub } from "../src/game";
import { canDamage, gunGameWeapon, nextTeam, validateJoin, weaponDamage, winner } from "../src/rules";
import { StatsStore } from "../src/store";
import { BOUNCE_PAD_LAUNCH_SPEED, WEAPONS, bouncePadAt, ladderAt, resolveGrenade, resolvePlayerPosition, type PlayerSnapshot } from "@veck/shared";

const player = (id: string, team: "red" | "green" | "none", kills = 0): PlayerSnapshot => ({
  id,
  name: id,
  team,
  position: { x: 0, y: 0, z: 0 },
  rotationY: 0,
  health: 100,
  alive: true,
  weapon: "revolver",
  kills,
  deaths: 0,
  score: kills,
  ammo: { revolver: 6, sniper: 4, grenade: 2, shottie: 3, watergun: 100 }
});

describe("game rules", () => {
  it("assigns teams round-robin by current balance", () => {
    expect(nextTeam([], "Team Mode")).toBe("red");
    expect(nextTeam([player("a", "red")], "Team Mode")).toBe("green");
    expect(nextTeam([player("a", "red"), player("b", "green")], "Team Mode")).toBe("red");
    expect(nextTeam([], "Free Play")).toBe("none");
  });

  it("blocks friendly fire in team mode", () => {
    expect(canDamage(player("a", "red"), player("b", "red"), "Team Mode")).toBe(false);
    expect(canDamage(player("a", "red"), player("b", "green"), "Team Mode")).toBe(true);
    expect(canDamage(player("a", "none"), player("b", "none"), "Free Play")).toBe(true);
  });

  it("enforces eight-player limit", () => {
    expect(validateJoin(7)).toBeNull();
    expect(validateJoin(8)).toMatch(/full/);
  });

  it("declares winners for free play and team mode", () => {
    expect(winner([player("a", "none", 1), player("b", "none", 3)], "Free Play")).toBe("b");
    expect(winner([player("r", "red", 4), player("g", "green", 2)], "Team Mode")).toBe("Red Team");
  });

  it("keeps grenade blast damage lethal near center and readable at the edge", () => {
    expect(weaponDamage("grenade", 0)).toBe(115);
    expect(weaponDamage("grenade", 8)).toBe(28);
    expect(weaponDamage("grenade", 9)).toBe(0);
  });

  it("lets sniper shots cover long sightlines", () => {
    expect(WEAPONS.sniper.range).toBeGreaterThanOrEqual(240);
    expect(WEAPONS.sniper.range).toBeGreaterThan(WEAPONS.revolver.range * 3);
  });

  it("rotates gun game weapons by kill count", () => {
    expect(gunGameWeapon(0)).toBe("revolver");
    expect(gunGameWeapon(1)).toBe("sniper");
    expect(gunGameWeapon(2)).toBe("grenade");
    expect(gunGameWeapon(3)).toBe("shottie");
    expect(gunGameWeapon(4)).toBe("watergun");
    expect(gunGameWeapon(5)).toBe("revolver");
  });

  it("does not fire the watergun unless a full stream tick is available", () => {
    const hub = new GameHub(new StatsStore(":memory:"));
    hub.hello("p1", "Tester");
    const gameId = hub.create("p1", "socket1", { map: "Pyramid", mode: "Free Play", durationMinutes: 3, weapon: "watergun" });
    const game = (hub as any).games.get(gameId);
    const playerState = game.players.get("p1");

    playerState.ammo.watergun = 1;
    expect(hub.fire("p1", { origin: { x: 0, y: 2, z: 0 }, direction: { x: 0, y: 0, z: -1 }, weapon: "watergun", seq: 1 })).toBeNull();
    expect(playerState.ammo.watergun).toBe(1);

    playerState.ammo.watergun = 2;
    expect(hub.fire("p1", { origin: { x: 0, y: 2, z: 0 }, direction: { x: 0, y: 0, z: -1 }, weapon: "watergun", seq: 2 })).toMatchObject({ shooterId: "p1", weapon: "watergun" });
    expect(playerState.ammo.watergun).toBe(0);
  });

  it("forces gun game starting weapons and advances on kill", () => {
    const hub = new GameHub(new StatsStore(":memory:"));
    hub.hello("p1", "Shooter");
    hub.hello("p2", "Target");
    const gameId = hub.create("p1", "socket1", { map: "Pyramid", mode: "Gun Game", durationMinutes: 3, weapon: "watergun" });
    hub.join("p2", "socket2", gameId, "sniper");
    const game = (hub as any).games.get(gameId);
    const attacker = game.players.get("p1");
    const victim = game.players.get("p2");

    expect(attacker.weapon).toBe("revolver");
    expect(victim.weapon).toBe("revolver");

    (hub as any).damage(game, attacker, victim, 100);

    expect(attacker.kills).toBe(1);
    expect(attacker.weapon).toBe("sniper");
    expect(attacker.ammo.sniper).toBe(WEAPONS.sniper.ammo);
  });

  it("rejoins existing players without resetting match state", () => {
    const hub = new GameHub(new StatsStore(":memory:"));
    hub.hello("p1", "Shooter");
    const gameId = hub.create("p1", "socket1", { map: "Pyramid", mode: "Free Play", durationMinutes: 3, weapon: "watergun" });
    const game = (hub as any).games.get(gameId);
    const playerState = game.players.get("p1");
    playerState.health = 37;
    playerState.kills = 4;
    playerState.ammo.watergun = 12;

    hub.markDisconnected("p1", "socket1");
    expect(hub.join("p1", "socket2", gameId, "sniper")).toEqual({ ok: true, gameId });

    expect(game.players.size).toBe(1);
    expect(playerState.socketId).toBe("socket2");
    expect(playerState.disconnectedAt).toBeUndefined();
    expect(playerState.health).toBe(37);
    expect(playerState.kills).toBe(4);
    expect(playerState.weapon).toBe("watergun");
    expect(playerState.ammo.watergun).toBe(12);

    hub.markDisconnected("p1", "socket1");
    expect(playerState.disconnectedAt).toBeUndefined();
  });

  it("removes disconnected players only after the reconnect grace period", () => {
    const hub = new GameHub(new StatsStore(":memory:"));
    hub.hello("p1", "Shooter");
    const gameId = hub.create("p1", "socket1", { map: "Pyramid", mode: "Free Play", durationMinutes: 3, weapon: "revolver" });
    const game = (hub as any).games.get(gameId);

    hub.markDisconnected("p1", "socket1");
    expect(hub.tick()).toHaveLength(1);
    expect(game.players.has("p1")).toBe(true);

    game.players.get("p1").disconnectedAt = Date.now() - 12_001;
    expect(hub.tick()).toHaveLength(0);
    expect((hub as any).games.has(gameId)).toBe(false);
  });

  it("clamps players to perimeter wall inner faces on sealed maps", () => {
    expect(resolvePlayerPosition("Pyramid", { x: 49, y: 1.2, z: 0 }).x).toBeCloseTo(44.55);
    expect(resolvePlayerPosition("Practice Range", { x: 0, y: 1.2, z: -63 }).z).toBeCloseTo(-60.45);
    expect(resolvePlayerPosition("Subway", { x: 57, y: 8.2, z: 0 }).x).toBeCloseTo(55.95);
    expect(resolvePlayerPosition("Blueprint", { x: -60, y: 1.2, z: 0 }).x).toBeCloseTo(-54.45);
    expect(resolvePlayerPosition("Forest", { x: 60, y: 1.2, z: 0 }).x).toBeCloseTo(53.35);
  });

  it("keeps practice range ladders reachable from the outside without snapping players to the roof", () => {
    const floorPos = resolvePlayerPosition("Practice Range", { x: 50, y: 1.2, z: 41.3 }, { x: 50, y: 1.2, z: 39 });
    expect(floorPos.y).toBeCloseTo(1.2);
    expect(ladderAt("Practice Range", floorPos)?.bottomY).toBeCloseTo(1.2);

    const climbingPos = resolvePlayerPosition("Practice Range", { x: 50, y: 3.4, z: 42.15 }, { x: 50, y: 3.2, z: 42.15 });
    expect(climbingPos.y).toBeCloseTo(3.4);
    const ladder = ladderAt("Practice Range", climbingPos);
    expect(ladder?.topY).toBeCloseTo(12);
    expect(ladder?.exit).toMatchObject({ x: 50, y: 12 });
    expect(ladder?.exit.z).toBeCloseTo(44.8);
    expect(ladder?.mount).toMatchObject({ x: 50 });
    expect(ladder?.mount.z).toBeCloseTo(41.3);
  });

  it("keeps the relocated practice ladder clear of the tower walls and old dead-end route", () => {
    const outside = resolvePlayerPosition("Practice Range", { x: 50, y: 1.2, z: 41.3 }, { x: 50, y: 1.2, z: 39 });
    const oldDeadEnd = ladderAt("Practice Range", { x: 44, y: 5.5, z: 51.95 });

    expect(outside.z).toBeCloseTo(41.3);
    expect(ladderAt("Practice Range", outside)?.bottomY).toBeCloseTo(1.2);
    expect(oldDeadEnd).toBeNull();
  });

  it("supports players after they exit the top of a practice ladder", () => {
    const ladder = ladderAt("Practice Range", { x: 50, y: 11.98, z: 42.15 });
    expect(ladder?.exit).toMatchObject({ x: 50, y: 12 });
    expect(ladder?.exit.z).toBeCloseTo(44.8);
    expect(ladder?.mount.z).toBeLessThan(42.15);

    const landed = resolvePlayerPosition("Practice Range", ladder!.exit, { x: 50, y: 11.95, z: 42.15 });
    expect(landed).toMatchObject(ladder!.exit);
  });

  it("keeps active practice ladder climbing outside the platform face", () => {
    const ladder = ladderAt("Practice Range", { x: 50, y: 5.5, z: 41.3 });
    expect(ladder?.mount).toMatchObject({ x: 50 });
    expect(ladder?.mount.z).toBeCloseTo(41.3);

    const climbing = resolvePlayerPosition("Practice Range", { x: ladder!.mount.x, y: 7.8, z: ladder!.mount.z }, { x: 50, y: 7.5, z: 41.3 });
    expect(climbing).toMatchObject({ x: 50, y: 7.8 });
    expect(climbing.z).toBeCloseTo(41.3);
  });

  it("does not snap floor movement onto the practice right platform or approach ramp", () => {
    const underPlatform = resolvePlayerPosition("Practice Range", { x: 28, y: 1.2, z: -23 }, { x: 28, y: 1.2, z: -15 });
    expect(underPlatform.y).toBeCloseTo(1.2);

    const atOldRamp = resolvePlayerPosition("Practice Range", { x: 14, y: 1.2, z: -13 }, { x: 14, y: 1.2, z: -3 });
    expect(atOldRamp.y).toBeCloseTo(1.2);
  });

  it("keeps floor movement under the practice left platform from snapping upward", () => {
    const underPlatform = resolvePlayerPosition("Practice Range", { x: -26, y: 1.2, z: 22 }, { x: -26, y: 1.2, z: 14 });
    expect(underPlatform.y).toBeCloseTo(1.2);
  });

  it("keeps floor movement under the practice back platform from snapping upward", () => {
    const underPlatform = resolvePlayerPosition("Practice Range", { x: 0, y: 1.2, z: 43 }, { x: 0, y: 1.2, z: 36 });
    expect(underPlatform.y).toBeCloseTo(1.2);
  });

  it("keeps the practice right platform landable from above and exposes its bounce pad", () => {
    const landed = resolvePlayerPosition("Practice Range", { x: 28, y: 6.55, z: -23 }, { x: 28, y: 6.8, z: -23 });
    expect(landed).toMatchObject({ x: 28, y: 6.55, z: -23 });

    const pad = bouncePadAt("Practice Range", { x: 18.4, y: 1.2, z: -15.6 });
    expect(pad?.id).toBe("practice-right-platform-bounce");
    expect(pad?.launchVelocity).toBe(BOUNCE_PAD_LAUNCH_SPEED);
  });

  it("keeps subway stair sides open while blocking underneath and the lower back wall", () => {
    const sideOpen = resolvePlayerPosition("Subway", { x: 11.6, y: 2.5, z: 30 }, { x: 10.6, y: 2.5, z: 30 });
    expect(sideOpen.x).toBeCloseTo(11.6);
    expect(sideOpen.y).toBeCloseTo(2.5);

    const backBlocked = resolvePlayerPosition("Subway", { x: 16.5, y: 2.5, z: 39.1 }, { x: 16.5, y: 2.5, z: 40 });
    expect(backBlocked.z).toBeGreaterThan(39.5);
    expect(backBlocked.y).toBeCloseTo(2.5);

    let underBlocked = { x: 24, y: 2.5, z: 30 };
    for (let i = 0; i < 30; i++) underBlocked = resolvePlayerPosition("Subway", { x: underBlocked.x - 0.6, y: underBlocked.y, z: underBlocked.z }, underBlocked);
    expect(underBlocked.x).toBeGreaterThan(21);
    expect(underBlocked.y).toBeCloseTo(2.5);

    const frontStep = resolvePlayerPosition("Subway", { x: 16.5, y: 2.5, z: 24 }, { x: 16.5, y: 2.5, z: 20 });
    expect(frontStep.z).toBeCloseTo(24);
    expect(frontStep.y).toBeGreaterThan(2.5);

    let down = { x: 16.5, y: 8.2, z: 46 };
    for (let i = 0; i < 60; i++) down = resolvePlayerPosition("Subway", { x: down.x, y: down.y, z: down.z - 0.6 }, down);
    expect(down.y).toBeCloseTo(2.5);
    expect(down.z).toBeLessThan(24);
  });

  it("blocks players from walking through subway entrance railings on the street deck", () => {
    let pos = { x: -22.4, y: 8.2, z: -32 };
    for (let i = 0; i < 20; i++) pos = resolvePlayerPosition("Subway", { x: pos.x + 0.2, y: pos.y, z: pos.z }, pos);

    expect(pos.x).toBeLessThan(-22);
    expect(pos.y).toBeCloseTo(8.2);
  });

  it("reflects grenades off the upper half of downstairs subway walls", () => {
    const hit = resolveGrenade("Subway", { x: -23.9, y: 3.6, z: 0 }, { x: 18, y: 0, z: 0 });

    expect(hit.collided).toBe(true);
    expect(hit.velocity.x).toBeLessThan(0);
    expect(hit.position.x).toBeLessThanOrEqual(-24);
  });

  it("keeps grenades resting on flat floors at or above world floor height", () => {
    const resting = resolveGrenade("Pyramid", { x: 0, y: 1.05, z: 0 }, { x: 0, y: -1, z: 0 });

    expect(resting.collided).toBe(true);
    expect(resting.position.y).toBeGreaterThanOrEqual(1.2);
    expect(resting.velocity.y).toBeGreaterThanOrEqual(0);
  });

  it("does not award solo round wins or coins", () => {
    const store = new StatsStore(":memory:");
    const hub = new GameHub(store);
    hub.hello("solo", "Solo");
    const gameId = hub.create("solo", "socket-solo", { map: "Pyramid", mode: "Free Play", durationMinutes: 3, weapon: "revolver" });
    const game = (hub as any).games.get(gameId);

    game.endsAt = Date.now() - 1;
    hub.tick();

    expect(store.get("solo")).toMatchObject({ wins: 0, gamesPlayed: 1, coins: 0 });
    expect(hub.drainStatsEmits()).toHaveLength(1);
  });
});
