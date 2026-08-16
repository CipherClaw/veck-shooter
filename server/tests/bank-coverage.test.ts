import { describe, expect, it } from "vitest";
import { ARENAS } from "@veck/shared";

const bankInteriorMin = -41.3;
const bankInteriorMax = 41.3;
const upperFloorTop = 4.8;
const coverageEpsilon = 1e-9;

const intendedOpenings = [
  { id: "atrium", minX: -7.65, maxX: 7.65, minZ: -15.65, maxZ: 15.65 },
  { id: "stairwell", minX: -39.5, maxX: -22.1, minZ: -8.3, maxZ: 6.3 }
] as const;

function isInsideIntendedOpening(x: number, z: number) {
  return intendedOpenings.some((opening) => x > opening.minX && x < opening.maxX && z > opening.minZ && z < opening.maxZ);
}

describe("Bank Heist upper-floor coverage", () => {
  it("covers the full upper-floor interior except the atrium and stairwell openings", () => {
    const supportingColliders = ARENAS["Bank Heist"].colliders.filter((collider) =>
      collider.center.y + collider.size.y / 2 >= upperFloorTop - 0.1
    );
    const isCovered = (x: number, z: number) => supportingColliders.some((collider) =>
      x >= collider.center.x - collider.size.x / 2 - coverageEpsilon
      && x <= collider.center.x + collider.size.x / 2 + coverageEpsilon
      && z >= collider.center.z - collider.size.z / 2 - coverageEpsilon
      && z <= collider.center.z + collider.size.z / 2 + coverageEpsilon
    );

    const probeCoordinates = (axis: "x" | "z") => {
      const centerKey = axis;
      const sizeKey = axis;
      const edges = new Set<number>([bankInteriorMin, bankInteriorMax]);
      for (const collider of supportingColliders) {
        edges.add(collider.center[centerKey] - collider.size[sizeKey] / 2);
        edges.add(collider.center[centerKey] + collider.size[sizeKey] / 2);
      }
      for (const opening of intendedOpenings) {
        edges.add(axis === "x" ? opening.minX : opening.minZ);
        edges.add(axis === "x" ? opening.maxX : opening.maxZ);
      }
      const sortedEdges = [...edges]
        .filter((value) => value >= bankInteriorMin && value <= bankInteriorMax)
        .sort((a, b) => a - b);
      return sortedEdges.flatMap((edge, index) => index === sortedEdges.length - 1
        ? [edge]
        : [edge, (edge + sortedEdges[index + 1]) / 2]);
    };

    const uncovered = new Map<string, { x: number; z: number }>();
    const checkPoint = (x: number, z: number) => {
      if (isInsideIntendedOpening(x, z) || isCovered(x, z)) return;
      const key = `${x.toFixed(4)},${z.toFixed(4)}`;
      uncovered.set(key, { x: Number(x.toFixed(4)), z: Number(z.toFixed(4)) });
    };

    const gridSteps = Math.round((bankInteriorMax - bankInteriorMin) / 0.1);
    for (let xStep = 0; xStep <= gridSteps; xStep += 1) {
      const x = bankInteriorMin + xStep * 0.1;
      for (let zStep = 0; zStep <= gridSteps; zStep += 1) {
        checkPoint(x, bankInteriorMin + zStep * 0.1);
      }
    }

    // Midpoints between every collider edge expose slivers narrower than the 0.1-unit grid.
    for (const x of probeCoordinates("x")) {
      for (const z of probeCoordinates("z")) checkPoint(x, z);
    }

    const sample = [...uncovered.values()].slice(0, 100);
    expect(uncovered.size, `Found ${uncovered.size} uncovered points; first ${sample.length}: ${JSON.stringify(sample)}`).toBe(0);
  });
});
