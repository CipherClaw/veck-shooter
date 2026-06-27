import { describe, expect, it } from "vitest";
import { ARENAS, firstShotBlock } from "@veck/shared";

describe("shot occlusion", () => {
  it("blocks Bank Heist shots through the atrium glass", () => {
    const block = firstShotBlock("Bank Heist", { x: 0, y: 1.8, z: -17 }, { x: 0, y: 0, z: 1 }, 70);

    expect(block).not.toBeNull();
    expect(block!).toBeCloseTo(0.65);
    expect(block!).toBeLessThan(30);
  });

  it("returns null when the ray stays in open Bank Heist space", () => {
    expect(firstShotBlock("Bank Heist", { x: 0, y: 1.8, z: -17 }, { x: 0, y: 0, z: -1 }, 3)).toBeNull();
  });

  it("opts only Bank Heist into shot occlusion", () => {
    expect(ARENAS["Bank Heist"].occludeShots).toBe(true);
    expect(ARENAS.Pyramid.occludeShots).toBeFalsy();
  });
});
