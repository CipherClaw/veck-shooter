import { describe, expect, it } from "vitest";
import { ARENAS, resolvePlayerPosition, type Vec3 } from "@veck/shared";

const dt = 1 / 60;
const RISE_GRAVITY = 19;
const FALL_GRAVITY = 32;

function clientFallFrame(position: Vec3, previous: Vec3, verticalVelocity: number, horizontalVelocity: Pick<Vec3, "x" | "z">) {
  const arena = ARENAS.Blueprint;
  const ceiling = arena.ceiling ?? 12;
  const gravity = verticalVelocity > 0 ? RISE_GRAVITY : FALL_GRAVITY;
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

function simulateClientFall(start: Vec3, verticalVelocity = 0) {
  let position = { ...start };
  let velocity = verticalVelocity;

  for (let frame = 0; frame < 600; frame++) {
    const previous = { ...position };
    const next = clientFallFrame(position, previous, velocity, { x: 0, z: 0 });
    position = next.resolved;
    velocity = next.verticalVelocity;
    if (next.grounded) return { ...next, frame, position };
  }

  throw new Error(`fall did not settle from y=${start.y}`);
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
    const frame = clientFallFrame({ x: -27, y: 13.76, z: 7 }, previous, -1, { x: 0, z: 0 });

    expect(frame.resolved).toMatchObject({ x: -27, y: 14, z: 7 });
    expect(frame.grounded).toBe(true);
    expect(frame.verticalVelocity).toBe(0);
  });

  it("does not lift a descending player from below onto the next Blueprint tower deck", () => {
    const previous = { x: -18, y: 20.7, z: -10 };
    const frame = clientFallFrame({ x: -18, y: 20.5, z: -10 }, previous, -1, { x: 0, z: 0 });

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

  it("settles a free fall from y=25 onto the central Blueprint deck at y=21", () => {
    const frame = simulateClientFall({ x: -18, y: 25, z: -10 });

    expect(frame.position).toMatchObject({ x: -18, y: 21, z: -10 });
    expect(frame.grounded).toBe(true);
    expect(frame.position.y).not.toBe(1.2);
  });

  it("settles a free fall from y=20.5 onto the central Blueprint deck at y=14", () => {
    const frame = simulateClientFall({ x: -18, y: 20.5, z: -10 });

    expect(frame.position).toMatchObject({ x: -18, y: 14, z: -10 });
    expect(frame.grounded).toBe(true);
    expect(frame.position.y).not.toBe(1.2);
  });

  it("settles a free fall from y=13.5 onto the central Blueprint deck at y=7", () => {
    const frame = simulateClientFall({ x: -18, y: 13.5, z: -10 });

    expect(frame.position).toMatchObject({ x: -18, y: 7, z: -10 });
    expect(frame.grounded).toBe(true);
    expect(frame.position.y).not.toBe(1.2);
  });
});
