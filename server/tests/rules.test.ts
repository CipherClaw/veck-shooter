import { describe, expect, it } from "vitest";
import { GameHub } from "../src/game";
import { canDamage, nextTeam, validateJoin, weaponDamage, winner } from "../src/rules";
import { StatsStore } from "../src/store";
import { ladderAt, resolvePlayerPosition, type PlayerSnapshot } from "@veck/shared";

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

  it("keeps practice range ladders from snapping players to the roof", () => {
    const floorPos = resolvePlayerPosition("Practice Range", { x: 48, y: 1.2, z: 48 }, { x: 48, y: 1.2, z: 46 });
    expect(floorPos.y).toBeCloseTo(1.2);

    const climbingPos = resolvePlayerPosition("Practice Range", { x: 48, y: 3.4, z: 48 }, { x: 48, y: 3.2, z: 48 });
    expect(climbingPos.y).toBeCloseTo(3.4);
    expect(ladderAt("Practice Range", climbingPos)).toMatchObject({ topY: 9.7 });
  });
});
