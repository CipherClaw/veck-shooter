import { describe, expect, it } from "vitest";
import { canDamage, nextTeam, validateJoin, winner } from "../src/rules";
import type { PlayerSnapshot } from "@veck/shared";

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
});
