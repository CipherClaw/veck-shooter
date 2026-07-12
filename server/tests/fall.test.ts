import { describe, expect, it } from "vitest";
import { ARENAS, resolvePlayerPosition, type Vec3 } from "@veck/shared";

const dt = 1 / 60;
const gravity = 32;

function clientFallFrame(position: Vec3, previous: Vec3, verticalVelocity: number, horizontalVelocity: Pick<Vec3, "x" | "z">) {
  const arena = ARENAS.Blueprint;
  const ceiling = arena.ceiling ?? 12;
  const nextVerticalVelocity = verticalVelocity - gravity * dt;
  const raw = {
    x: position.x + horizontalVelocity.x * dt,
    y: Math.max(1.2, Math.min(ceiling, position.y + nextVerticalVelocity * dt)),
    z: position.z + horizontalVelocity.z * dt
  };
  const resolved = resolvePlayerPosition("Blueprint", raw, previous);
  const grounded = resolved.y > raw.y || resolved.y <= 1.21;

  return {
    raw,
    resolved,
    grounded,
    verticalVelocity: grounded ? 0 : nextVerticalVelocity
  };
}

describe("high platform falling", () => {
  it("does not re-catch a descending Blueprint player onto an overhead deck", () => {
    const previous = { x: -18, y: 28, z: -10 };
    const frame = clientFallFrame({ x: -18, y: 20, z: -10 }, previous, -0.5, { x: 0, z: 0 });

    expect(frame.resolved.y - frame.raw.y).toBeLessThanOrEqual(0.8);
    expect(frame.grounded).toBe(false);
    expect(frame.verticalVelocity).toBeLessThan(0);
  });

  it("still settles onto a lower Blueprint deck from inside the landing snap band", () => {
    const previous = { x: -27, y: 14.35, z: 7 };
    const frame = clientFallFrame({ x: -27, y: 14.02, z: 7 }, previous, -1, { x: 0, z: 0 });

    expect(frame.resolved).toMatchObject({ x: -27, y: 14, z: 7 });
    expect(frame.grounded).toBe(true);
    expect(frame.verticalVelocity).toBe(0);
  });

  it("does not lift a descending player onto the next Blueprint tower deck in the old snap band", () => {
    const previous = { x: -18, y: 21.2, z: -10 };
    const frame = clientFallFrame({ x: -18, y: 20.82, z: -10 }, previous, -1, { x: 0, z: 0 });

    expect(frame.raw.y).toBeGreaterThan(20.2);
    expect(frame.resolved.y).toBe(frame.raw.y);
    expect(frame.resolved.y).toBeLessThan(21);
    expect(frame.grounded).toBe(false);
    expect(frame.verticalVelocity).toBeLessThan(0);
  });

  it("settles a genuine single-frame landing overshoot onto a Blueprint tower deck", () => {
    const previous = { x: -18, y: 21.2, z: -10 };
    const frame = clientFallFrame({ x: -18, y: 21.02, z: -10 }, previous, -1, { x: 0, z: 0 });

    expect(frame.resolved).toMatchObject({ x: -18, y: 21, z: -10 });
    expect(frame.grounded).toBe(true);
    expect(frame.verticalVelocity).toBe(0);
  });
});
