import { describe, expect, it } from "vitest";
import { spendLocalAmmo, type WeaponId } from "@veck/shared";

function ammoFor(weapon: WeaponId, amount: number) {
  return { revolver: 0, sniper: 0, grenade: 0, shottie: 0, watergun: 0, fist: 0, [weapon]: amount };
}

describe("local ammo spending", () => {
  it("pays for every revolver round and rejects the seventh", () => {
    const ammo = ammoFor("revolver", 6);
    expect(Array.from({ length: 7 }, () => spendLocalAmmo(ammo, "revolver"))).toEqual([true, true, true, true, true, true, false]);
    expect(ammo.revolver).toBe(0);
  });

  it("pays for every affordable watergun shot", () => {
    const ammo = ammoFor("watergun", 8);
    expect(Array.from({ length: 5 }, () => spendLocalAmmo(ammo, "watergun"))).toEqual([true, true, true, true, false]);
    expect(ammo.watergun).toBe(0);
  });

  it("always permits the zero-cost fist", () => {
    const ammo = ammoFor("fist", 0);
    expect(Array.from({ length: 4 }, () => spendLocalAmmo(ammo, "fist"))).toEqual([true, true, true, true]);
    expect(ammo.fist).toBe(0);
  });

  it("does not decrement ammo when a shot cannot be paid for", () => {
    const ammo = ammoFor("watergun", 1);
    expect(spendLocalAmmo(ammo, "watergun")).toBe(false);
    expect(ammo.watergun).toBe(1);
  });
});
