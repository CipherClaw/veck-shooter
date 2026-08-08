import { describe, expect, it } from "vitest";
import { ARENAS, FALL_GRAVITY, MAPS, MAX_CLIENT_TIMESTEP, MAX_GROUNDED_SETTLE_DIP, PLAYER_RADIUS, bouncePadAt, resolvePlayerPosition, type ArenaCollider, type MapName, type Vec3 } from "@veck/shared";

const dt = 1 / 60;
const RISE_GRAVITY = 19;

function clientPhysicsFrame(
  map: MapName,
  position: Vec3,
  previous: Vec3,
  verticalVelocity: number,
  horizontalVelocity: Pick<Vec3, "x" | "z">,
  step = dt
) {
  const arena = ARENAS[map];
  const ceiling = arena.ceiling ?? 12;
  const gravity = verticalVelocity > 0 ? RISE_GRAVITY : FALL_GRAVITY;
  const nextVerticalVelocity = verticalVelocity - gravity * step;
  const raw = {
    x: position.x + horizontalVelocity.x * step,
    y: Math.max(1.2, Math.min(ceiling, position.y + nextVerticalVelocity * step)),
    z: position.z + horizontalVelocity.z * step
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

function simulateClientWalk(map: MapName, start: Vec3, horizontalVelocity: Pick<Vec3, "x" | "z">, seconds: number, fps: number) {
  const step = Math.min(1 / fps, MAX_CLIENT_TIMESTEP);
  let position = { ...start };
  let velocity = 0;
  let maxY = start.y;

  for (let frame = 0; frame < Math.ceil(seconds / step); frame += 1) {
    const previous = { ...position };
    const next = clientPhysicsFrame(map, position, previous, velocity, horizontalVelocity, step);
    position = next.resolved;
    velocity = next.verticalVelocity;
    maxY = Math.max(maxY, position.y);
  }

  return { position, maxY };
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

function colliderSolidAt(arena: (typeof ARENAS)[MapName], point: Vec3) {
  return arena.colliders.find((collider) => {
    if (collider.ladder) return false;
    const top = collider.center.y + collider.size.y / 2 + 1.2;
    const bottom = collider.center.y - collider.size.y / 2;
    return Math.abs(point.x - collider.center.x) < collider.size.x / 2 + PLAYER_RADIUS
      && Math.abs(point.z - collider.center.z) < collider.size.z / 2 + PLAYER_RADIUS
      && point.y > bottom + 0.05 && point.y < top - 0.05;
  });
}

function insideCollider(collider: ArenaCollider, point: Vec3) {
  const top = collider.center.y + collider.size.y / 2 + 1.2;
  const bottom = collider.center.y - collider.size.y / 2;
  return Math.abs(point.x - collider.center.x) < collider.size.x / 2 + PLAYER_RADIUS - 0.05
    && Math.abs(point.z - collider.center.z) < collider.size.z / 2 + PLAYER_RADIUS - 0.05
    && point.y > bottom + 0.05 && point.y < top - 0.05;
}

describe("high platform falling", () => {
  for (const fps of [144, 60, 30, 24, 20]) {
    for (const x of [-16.5, 16.5]) {
      for (const zSign of [-1, 1]) {
        it(`walks up the ${x < 0 ? "west" : "east"} ${zSign < 0 ? "south" : "north"} Subway stairs at ${fps} fps`, () => {
          const walk = simulateClientWalk("Subway", { x, y: 2.5, z: zSign * 20 }, { x: 0, z: zSign * 15 }, 2, fps);

          expect(walk.maxY).toBeCloseTo(8.2);
          expect(walk.position.y).toBeCloseTo(8.2);
        });
      }
    }
  }

  for (const fps of [60, 20]) {
    it(`walks up the Forest hill under gravity at ${fps} fps`, () => {
      const walk = simulateClientWalk("Forest", { x: 0, y: 1.2, z: 14 }, { x: 0, z: -15 }, 3, fps);

      expect(walk.maxY).toBeCloseTo(4.1);
    });
  }

  it("walks up the Pyramid tiers under gravity without jumping at 20 fps", () => {
    const walk = simulateClientWalk("Pyramid", { x: 0, y: 1.2, z: 44 }, { x: 0, z: -15 }, 10 / 3, 20);

    expect(walk.maxY).toBeGreaterThanOrEqual(10.9);
  });

  it("recognizes repeated 20 fps gravity dips as settling on flat support", () => {
    let position = { x: 16.5, y: 2.5, z: 20 };
    for (let frame = 0; frame < 20; frame += 1) {
      const previous = { ...position };
      const next = clientPhysicsFrame("Subway", position, previous, 0, { x: 0, z: 0 }, MAX_CLIENT_TIMESTEP);
      expect(previous.y - next.raw.y).toBeCloseTo(MAX_GROUNDED_SETTLE_DIP);
      expect(next.resolved.y).toBe(2.5);
      expect(next.grounded).toBe(true);
      position = next.resolved;
    }
  });

  it("does not snap a player falling from above onto a Blueprint perimeter wall", () => {
    const previous = { x: 56, y: 11, z: 48 };
    const resolved = resolvePlayerPosition("Blueprint", { x: 56, y: 9, z: 48 }, previous);

    expect(resolved.y).toBe(9);
    expect(resolved.y).toBeGreaterThan(8.38);
  });

  it("does not snap a player falling past a Blueprint perimeter wall at 20 fps", () => {
    const previous = { x: 56, y: 11, z: 48 };
    const frame = clientPhysicsFrame("Blueprint", { x: 56, y: 9, z: 48 }, previous, -40, { x: 0, z: 0 }, MAX_CLIENT_TIMESTEP);

    expect(frame.resolved.y).toBe(frame.raw.y);
    expect(frame.grounded).toBe(false);
  });

  it("keeps blocking gravity-pressed movement into a Bank Heist wall end cap", () => {
    const collider = ARENAS["Bank Heist"].colliders.find((candidate) => candidate.id === "bank-ground-ring-north-west-1");
    expect(collider).toBeDefined();
    if (!collider) throw new Error("missing Bank Heist north-west wall");

    const paddedBoundary = collider.center.x - collider.size.x / 2 - PLAYER_RADIUS;
    let position = { x: -38.72, y: 1.2, z: collider.center.z };
    for (let tick = 0; tick < 30; tick += 1) {
      position = resolvePlayerPosition("Bank Heist", { x: position.x + 0.22, y: position.y - 0.06, z: position.z }, position);
      expect(position.x).toBeLessThanOrEqual(paddedBoundary + 1e-9);
    }
  });

  it("blocks gravity-pressed movement into every unsteppable ground-level collider", () => {
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
    let checkedApproaches = 0;

    for (const map of MAPS) {
      const arena = ARENAS[map];
      const bounds = arena.playBounds ?? arena.bounds - PLAYER_RADIUS;
      for (const collider of arena.colliders) {
        const top = collider.center.y + collider.size.y / 2 + 1.2;
        const bottom = collider.center.y - collider.size.y / 2;
        if (collider.ladder || collider.climbable || bottom > 1.2 || top <= 1.2 + 0.95) continue;

        for (const [dx, dz] of directions) {
          const faceDistance = dx === 0 ? collider.size.z / 2 + PLAYER_RADIUS : collider.size.x / 2 + PLAYER_RADIUS;
          let position = {
            x: collider.center.x - dx * (faceDistance + 1.6),
            y: 1.2,
            z: collider.center.z - dz * (faceDistance + 1.6)
          };
          if (Math.abs(position.x) > bounds || Math.abs(position.z) > bounds || colliderSolidAt(arena, position)) continue;
          checkedApproaches += 1;

          for (let tick = 0; tick < 25; tick += 1) {
            position = resolvePlayerPosition(map, { x: position.x + dx * 0.22, y: position.y - 0.06, z: position.z + dz * 0.22 }, position);
            expect(insideCollider(collider, position), `${map}/${collider.id} direction ${dx},${dz} tick ${tick}`).toBe(false);
          }
        }
      }
    }

    expect(checkedApproaches).toBeGreaterThan(0);
  });

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

    expect(frame.resolved).toMatchObject({ x: -27, y: 13.99, z: 7 });
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
