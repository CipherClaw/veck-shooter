import { describe, expect, it } from "vitest";
import { ARENAS, bouncePadAt, resolvePlayerPosition, type MapName, type Vec3 } from "@veck/shared";

const dt = 1 / 60;
const RISE_GRAVITY = 19;
const FALL_GRAVITY = 32;

function clientPhysicsFrame(
  map: MapName,
  position: Vec3,
  previous: Vec3,
  verticalVelocity: number,
  horizontalVelocity: Pick<Vec3, "x" | "z">
) {
  const arena = ARENAS[map];
  const ceiling = arena.ceiling ?? 12;
  const gravity = verticalVelocity > 0 ? RISE_GRAVITY : FALL_GRAVITY;
  const nextVerticalVelocity = verticalVelocity - gravity * dt;
  const raw = {
    x: position.x + horizontalVelocity.x * dt,
    y: Math.max(1.2, Math.min(ceiling, position.y + nextVerticalVelocity * dt)),
    z: position.z + horizontalVelocity.z * dt
  };
  const resolved = resolvePlayerPosition(map, raw, previous);
  const grounded = resolved.y > raw.y || resolved.y <= 1.21;

  return {
    raw,
    resolved,
    grounded,
    verticalVelocity: grounded ? 0 : nextVerticalVelocity
  };
}

function clientFallFrame(position: Vec3, previous: Vec3, verticalVelocity: number, horizontalVelocity: Pick<Vec3, "x" | "z">) {
  return clientPhysicsFrame("Blueprint", position, previous, verticalVelocity, horizontalVelocity);
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

function simulateClientLaunch(map: MapName, start: Vec3, verticalVelocity: number) {
  let position = { ...start };
  let velocity = verticalVelocity;
  let maxY = start.y;
  let leftGround = false;

  for (let frame = 0; frame < 600; frame++) {
    const previous = { ...position };
    const next = clientPhysicsFrame(map, position, previous, velocity, { x: 0, z: 0 });
    position = next.resolved;
    velocity = next.verticalVelocity;
    maxY = Math.max(maxY, position.y);
    if (position.y > start.y + 0.05) leftGround = true;
    if (leftGround && next.grounded) return { ...next, frame, position, maxY };
  }

  throw new Error(`launch did not settle from y=${start.y}`);
}

function simulateBlueprintBounceWithAuthoritativeSnapshots() {
  const map: MapName = "Blueprint";
  const oneWayLatency = 0.15;
  const snapshotDt = 1 / 20;
  let nextSnapshotAt = 0;
  let serverPosition = { x: -3, y: 1.2, z: -31 };
  let serverInputSeq = 0;
  let localPosition = { ...serverPosition };
  let verticalVelocity = 0;
  let inputSeq = 0;
  let activeBounceSeq = 0;
  let grounded = true;
  let maxY = localPosition.y;
  let bounceTriggers = 0;
  let hardSnaps = 0;
  const inputQueue: { at: number; seq: number; position: Vec3 }[] = [];
  const snapshotQueue: { at: number; inputSeq: number; position: Vec3 }[] = [];

  for (let frame = 0; frame < 180; frame += 1) {
    const now = frame * dt;
    const previous = { ...localPosition };
    const next = { x: localPosition.x, y: localPosition.y, z: localPosition.z + 15 * dt };
    const bouncePad = bouncePadAt(map, next);
    if (bouncePad && previous.y <= 1.35 && next.y <= 1.35 && verticalVelocity <= 0) {
      verticalVelocity = bouncePad.launchVelocity;
      activeBounceSeq = inputSeq + 1;
      bounceTriggers += 1;
    }
    const gravity = verticalVelocity > 0 ? RISE_GRAVITY : FALL_GRAVITY;
    verticalVelocity -= gravity * dt;
    next.y = Math.max(1.2, Math.min(ARENAS[map].ceiling ?? 12, next.y + verticalVelocity * dt));
    const resolved = resolvePlayerPosition(map, next, previous);
    grounded = resolved.y > next.y || resolved.y <= 1.21;
    if (grounded) verticalVelocity = 0;
    if (grounded) activeBounceSeq = 0;
    localPosition = resolved;
    maxY = Math.max(maxY, localPosition.y);

    inputSeq += 1;
    inputQueue.push({ at: now + oneWayLatency, seq: inputSeq, position: { ...localPosition } });
    while (inputQueue.length > 0 && inputQueue[0].at <= now) {
      const input = inputQueue.shift()!;
      serverPosition = resolvePlayerPosition(map, input.position, serverPosition);
      serverInputSeq = input.seq;
    }
    if (now >= nextSnapshotAt - 1e-9) {
      snapshotQueue.push({ at: now + oneWayLatency, inputSeq: serverInputSeq, position: { ...serverPosition } });
      nextSnapshotAt += snapshotDt;
    }
    while (snapshotQueue.length > 0 && snapshotQueue[0].at <= now) {
      const snapshot = snapshotQueue.shift()!;
      const dx = localPosition.x - snapshot.position.x;
      const dy = localPosition.y - snapshot.position.y;
      const dz = localPosition.z - snapshot.position.z;
      const protectingBounceFlight = activeBounceSeq > 0 && !grounded && localPosition.y >= snapshot.position.y && snapshot.inputSeq < inputSeq;
      if (!protectingBounceFlight && dx * dx + dy * dy + dz * dz > 49) {
        localPosition = { ...snapshot.position };
        verticalVelocity = 0;
        hardSnaps += 1;
      }
    }
  }

  return { bounceTriggers, hardSnaps, maxY };
}

describe("high platform falling", () => {
  it("blocks a descending mid-jump player entering a real Bank Heist wall", () => {
    const previous = { x: 0, y: 2.4, z: -20.8 };
    const resolved = resolvePlayerPosition("Bank Heist", { x: 0, y: 2.1, z: -21.2 }, previous);

    expect(resolved.z).toBeCloseTo(-20.9);
  });

  it("blocks a high descending player pressing into a real Bank Heist upper wall", () => {
    const previous = { x: 20.8, y: 8, z: 0 };
    const resolved = resolvePlayerPosition("Bank Heist", { x: 21.2, y: 7.5, z: 0 }, previous);

    expect(resolved.x).toBeCloseTo(20.9);
  });

  it("still blocks a non-descending player entering a real Bank Heist wall", () => {
    const previous = { x: 0, y: 2.1, z: -20.8 };
    const resolved = resolvePlayerPosition("Bank Heist", { x: 0, y: 2.1, z: -21.2 }, previous);

    expect(resolved.z).toBeCloseTo(-20.9);
  });

  it("lets an already embedded descending player fall through a Blueprint deck without sideways ejection", () => {
    const previous = { x: -18, y: 20.7, z: -10 };
    const resolved = resolvePlayerPosition("Blueprint", { x: -18, y: 20.5, z: -10 }, previous);

    expect(resolved).toMatchObject({ x: -18, y: 20.5, z: -10 });
  });

  it("lets a normal jump leave flat Blueprint ground and return to the floor", () => {
    const start = { x: 0, y: 1.2, z: -40 };
    const launch = simulateClientLaunch("Blueprint", start, 7.8);

    expect(launch.maxY - start.y).toBeGreaterThanOrEqual(1.4);
    expect(launch.maxY - start.y).toBeLessThan(1.8);
    expect(launch.position).toMatchObject(start);
    expect(launch.grounded).toBe(true);
  });

  it("lets a real Blueprint bounce pad launch the player upward", () => {
    const pad = ARENAS.Blueprint.bouncePads?.find((candidate) => candidate.id === "blueprint-bounce-central");
    expect(pad).toBeDefined();
    if (!pad) throw new Error("missing Blueprint central bounce pad");

    const start = { x: pad.center.x, y: 1.2, z: pad.center.z };
    const launch = simulateClientLaunch("Blueprint", start, pad.launchVelocity);
    const analyticApex = (pad.launchVelocity * pad.launchVelocity) / (2 * RISE_GRAVITY);

    expect(launch.maxY - start.y).toBeGreaterThanOrEqual(analyticApex / 2);
    expect(launch.maxY).toBeGreaterThan(10);
    expect(launch.grounded).toBe(true);
  });

  it("does not let stale server snapshots cancel a Blueprint bounce launch", () => {
    const launch = simulateBlueprintBounceWithAuthoritativeSnapshots();

    expect(launch.bounceTriggers).toBeGreaterThanOrEqual(1);
    expect(launch.hardSnaps).toBe(0);
    expect(launch.maxY).toBeGreaterThan(25);
  });

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
