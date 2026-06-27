import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ARENAS, type ArenaBouncePad, type ArenaCollider, type MapName } from "@veck/shared";
import { useGame, type PracticeTargetFx } from "../state/store";

const bankTileColor = "#d7d2c8";
const bankSurfaceOverlap = 0.06;

function Tile({ collider, map }: { collider: ArenaCollider; map: MapName }) {
  const { center, size, color } = collider;
  const isBank = map === "Bank Heist";
  const isBankSurface = isBank && collider.id.includes("-surface-");
  const isBankStoneWall = isBank && (color.toLowerCase() === "#8f9699" || collider.id.includes("-lintel"));
  const isBankWoodWall = isBank && color.toLowerCase() === "#a77248";
  const displayColor = isBankStoneWall ? "#a8afb0" : isBankWoodWall ? "#9d6740" : color;
  return (
    <mesh
      position={[center.x, center.y, center.z]}
      scale={[size.x + (isBankSurface ? bankSurfaceOverlap : 0), size.y, size.z + (isBankSurface ? bankSurfaceOverlap : 0)]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={displayColor}
        roughness={isBankStoneWall ? 0.9 : 0.74}
        metalness={0.02}
        polygonOffset={isBankSurface}
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

function BouncePad({ pad }: { pad: ArenaBouncePad }) {
  return (
    <group position={[pad.center.x, pad.center.y, pad.center.z]}>
      <mesh receiveShadow>
        <cylinderGeometry args={[pad.radius, pad.radius, pad.height, 36]} />
        <meshStandardMaterial color={pad.color} roughness={0.38} metalness={0.08} />
      </mesh>
      <mesh position={[0, pad.height * 0.5 + 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[pad.radius * 0.62, 0.08, 10, 36]} />
        <meshStandardMaterial color="#f8fff2" emissive={pad.color} emissiveIntensity={0.2} roughness={0.32} />
      </mesh>
    </group>
  );
}

export function ArenaMap({ map }: { map: MapName }) {
  const arena = ARENAS[map];
  const isBank = map === "Bank Heist";
  const isForest = map === "Forest";
  const floorY = isBank ? -0.04 : 0;
  const gridY = 0.025;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, 0]} receiveShadow>
        <planeGeometry args={[arena.floorSize, arena.floorSize, 48, 48]} />
        <meshStandardMaterial color={isBank ? bankTileColor : arena.floorColor} roughness={isForest ? 0.96 : 0.88} />
      </mesh>
      {!isBank && !isForest && <gridHelper args={[arena.floorSize, arena.floorSize / 4, "#fff7d6", arena.gridColor]} position={[0, gridY, 0]} />}
      {arena.colliders.filter((collider) => !hiddenCollider(collider.id)).map((collider) => <Tile key={collider.id} collider={collider} map={map} />)}
      {arena.bouncePads?.map((pad) => <BouncePad key={pad.id} pad={pad} />)}
      {map === "Pyramid" && <PyramidDetails />}
      {map === "Practice Range" && <PracticeDetails />}
      {map === "Forest" && <ForestDetails />}
      {map === "Subway" && <SubwayDetails />}
      {map === "Blueprint" && <BlueprintDetails />}
      {map === "Bank Heist" && <BankHeistDetails />}
    </group>
  );
}

function hiddenCollider(id: string) {
  return id.startsWith("forest-tree")
    || id.startsWith("forest-climb")
    || id.startsWith("forest-rock")
    || id.startsWith("forest-log")
    || id.startsWith("subway-train")
    || id.startsWith("subway-railing")
    || id.startsWith("blueprint-ladder")
    || id.startsWith("practice-ladder")
    || id === "bank-atrium-garden-blocker"
    || id.includes("atrium-glass");
}

function PyramidDetails() {
  const pyramidTop = Math.max(...ARENAS.Pyramid.colliders.filter((collider) => collider.id.startsWith("pyramid-")).map((collider) => collider.center.y + collider.size.y / 2));
  return (
    <group>
      <mesh position={[0, pyramidTop + 0.9, 0]} castShadow>
        <octahedronGeometry args={[1.7, 0]} />
        <meshStandardMaterial color="#f7c948" emissive="#f59e0b" emissiveIntensity={0.28} roughness={0.45} />
      </mesh>
      {[-32, 32].map((x) => (
        <mesh key={x} position={[x, 3.4, 0]} castShadow>
          <boxGeometry args={[1.1, 6.8, 1.1]} />
          <meshStandardMaterial color="#7c5a32" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function PracticeDetails() {
  const colliders = ARENAS["Practice Range"].colliders;
  const visibleColliders = colliders.filter((collider) => !hiddenCollider(collider.id));
  const ladders = colliders.filter((collider) => collider.ladder && collider.id.startsWith("practice-ladder"));
  const practiceTargetFx = useGame((s) => s.practiceTargetFx);
  return (
    <group>
      {visibleColliders.map((collider) => <PracticeGridBox key={`grid-${collider.id}`} collider={collider} />)}
      {ladders.map((collider) => <CornerLadder key={collider.id} collider={collider} />)}
      {practiceTargets.map((target) => <PracticeTarget key={target.id} {...target} />)}
      {practiceTargetFx.map((fx) => <PracticeTargetBurst key={fx.id} fx={fx} />)}
      {ARENAS["Practice Range"].bouncePads?.map((pad) => (
        <pointLight key={`light-${pad.id}`} color={pad.color} intensity={0.45} distance={15} position={[pad.center.x, 1.4, pad.center.z]} />
      ))}
    </group>
  );
}

type PracticeTargetSpec = {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
};

const practiceTargets: PracticeTargetSpec[] = [
  { id: "north-house-high", position: [-7.5, 16.2, -15.86], rotation: [0, 0, 0], scale: 1.1 },
  { id: "north-house-low", position: [7.5, 5.7, -15.86], rotation: [0, 0, 0], scale: 0.95 },
  { id: "south-house-mid", position: [0, 12.9, 15.86], rotation: [0, Math.PI, 0], scale: 1 },
  { id: "west-house-mid", position: [-15.86, 10.4, 0], rotation: [0, -Math.PI / 2, 0], scale: 0.9 },
  { id: "east-house-high", position: [15.86, 20.5, 0], rotation: [0, Math.PI / 2, 0], scale: 1.05 },
  { id: "nw-tower-face", position: [-50, 23.5, -42.2], rotation: [0, 0, 0], scale: 1 },
  { id: "se-tower-face", position: [50, 23.5, 42.2], rotation: [0, Math.PI, 0], scale: 1 },
  { id: "west-overlook", position: [-31, 9.7, -15.25], rotation: [0, 0, 0], scale: 0.85 },
  { id: "east-overlook", position: [31, 9.7, 15.25], rotation: [0, Math.PI, 0], scale: 0.85 },
  { id: "float-northwest", position: [-28, 14.5, -32], rotation: [0, Math.PI / 4, 0], scale: 0.95 },
  { id: "float-southeast", position: [27, 17.2, 33], rotation: [0, -Math.PI * 0.7, 0], scale: 1 },
  { id: "float-center", position: [0, 31.5, -10], rotation: [0, 0, 0], scale: 1.15 }
];

function PracticeTarget({ id, position, rotation, scale = 1 }: PracticeTargetSpec) {
  const hidden = useGame((s) => Boolean(s.hiddenPracticeTargets[id]));
  if (hidden) return null;
  return (
    <group position={position} rotation={rotation} scale={[scale, scale, scale]} userData={{ practiceTargetId: id }}>
      <mesh castShadow>
        <torusGeometry args={[0.82, 0.09, 12, 42]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.12} roughness={0.44} />
      </mesh>
      <mesh position={[0, 0, -0.015]}>
        <circleGeometry args={[0.64, 36]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, -0.03]}>
        <torusGeometry args={[0.34, 0.055, 10, 32]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.1} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0, -0.045]}>
        <circleGeometry args={[0.12, 24]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.12} roughness={0.4} />
      </mesh>
    </group>
  );
}

function PracticeTargetBurst({ fx }: { fx: PracticeTargetFx }) {
  const group = useRef<THREE.Group>(null);
  const shards = useRef(
    Array.from({ length: 9 }, (_, i) => {
      const angle = i * 2.399;
      return new THREE.Vector3(Math.cos(angle) * (0.55 + (i % 3) * 0.18), Math.sin(i * 1.7) * 0.36, Math.sin(angle) * (0.55 + (i % 2) * 0.22));
    })
  );
  useFrame(() => {
    const age = Math.min(1, (performance.now() - fx.createdAt) / 480);
    if (!group.current) return;
    group.current.scale.setScalar(0.7 + age * 1.8);
    group.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      const dir = shards.current[i] ?? shards.current[0];
      mesh.position.set(dir.x * age, dir.y * age, dir.z * age);
      mesh.rotation.x += 0.12;
      mesh.rotation.y += 0.09;
      mesh.material.opacity = Math.max(0, 1 - age);
    });
  });
  return (
    <group ref={group} position={[fx.position.x, fx.position.y, fx.position.z]} userData={{ ignorePracticeTargetRaycast: true }}>
      {shards.current.map((_, i) => (
        <mesh key={i} castShadow>
          <boxGeometry args={[0.16, 0.16, 0.05]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#ef4444" : "#f8fafc"} emissive={i % 2 === 0 ? "#ef4444" : "#ffffff"} emissiveIntensity={0.35} roughness={0.44} transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
}

function PracticeGridBox({ collider }: { collider: ArenaCollider }) {
  const { center, size } = collider;
  const isLargeSurface = size.x > 8 || size.y > 8 || size.z > 8;
  return (
    <group position={[center.x, center.y, center.z]}>
      <mesh scale={[size.x * 1.004, size.y * 1.004, size.z * 1.004]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={isLargeSurface ? 0.34 : 0.24} depthWrite={false} />
      </mesh>
    </group>
  );
}

function CornerLadder({ collider }: { collider: ArenaCollider }) {
  const normal = collider.ladderNormal ?? { x: 0, z: 1 };
  const height = collider.size.y;
  const centerY = collider.center.y;
  const rungCount = Math.max(8, Math.floor(height / 0.72));
  const rungStart = -height / 2 + 0.48;
  const zFacing = Math.abs(normal.z) >= Math.abs(normal.x);
  return (
    <group position={[collider.center.x, centerY, collider.center.z]}>
      <mesh position={zFacing ? [0, 0, -normal.z * 0.13] : [-normal.x * 0.13, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={zFacing ? [2.3, height, 0.14] : [0.14, height, 2.3]} />
        <meshStandardMaterial color="#64717f" roughness={0.72} metalness={0.06} />
      </mesh>
      {[-0.78, 0.78].map((offset) => (
        <mesh key={offset} position={zFacing ? [offset, 0, normal.z * 0.1] : [normal.x * 0.1, 0, offset]} castShadow>
          <boxGeometry args={[0.22, height, 0.22]} />
          <meshStandardMaterial color="#9aa5af" roughness={0.58} metalness={0.12} />
        </mesh>
      ))}
      {Array.from({ length: rungCount }, (_, i) => (
        <mesh key={i} position={zFacing ? [0, rungStart + i * 0.72, normal.z * 0.2] : [normal.x * 0.2, rungStart + i * 0.72, 0]} castShadow>
          <boxGeometry args={zFacing ? [1.95, 0.14, 0.2] : [0.2, 0.14, 1.95]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.08} />
        </mesh>
      ))}
    </group>
  );
}

function BlueprintDetails() {
  const colliders = ARENAS.Blueprint.colliders;
  const visibleBlueprint = colliders.filter((collider) => collider.id.startsWith("blueprint-") && !collider.ladder);
  const slabs = visibleBlueprint.filter((collider) => collider.id.includes("-slab"));
  const ladders = colliders.filter((collider) => collider.ladder && collider.id.startsWith("blueprint-ladder"));
  return (
    <group>
      {visibleBlueprint.map((collider) => <BlueprintWireBox key={`wire-${collider.id}`} collider={collider} />)}
      {slabs.map((collider) => <BlueprintGridLines key={`grid-${collider.id}`} collider={collider} />)}
      {ladders.map((collider) => <BlueprintLadder key={collider.id} collider={collider} />)}
      {ARENAS.Blueprint.bouncePads?.map((pad) => (
        <pointLight key={`light-${pad.id}`} color={pad.color} intensity={0.55} distance={14} position={[pad.center.x, 1.2, pad.center.z]} />
      ))}
    </group>
  );
}

function BlueprintWireBox({ collider }: { collider: ArenaCollider }) {
  const { center, size } = collider;
  return (
    <mesh position={[center.x, center.y, center.z]} scale={[size.x * 1.006, size.y * 1.006, size.z * 1.006]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#e0f2fe" wireframe transparent opacity={0.46} depthWrite={false} />
    </mesh>
  );
}

function BlueprintGridLines({ collider }: { collider: ArenaCollider }) {
  const { center, size } = collider;
  const horizontalYs = Array.from({ length: Math.max(2, Math.floor(size.y / 3.5)) }, (_, i) => 1.7 + i * 3.5).filter((y) => y < size.y - 0.6);
  const longX = size.x >= size.z;
  const verticalCount = Math.max(2, Math.floor((longX ? size.x : size.z) / 4));
  const verticalOffsets = Array.from({ length: verticalCount + 1 }, (_, i) => -(longX ? size.x : size.z) / 2 + i * ((longX ? size.x : size.z) / verticalCount));
  const faceOffset = 0.73;
  return (
    <group position={[center.x, center.y - size.y / 2, center.z]}>
      {horizontalYs.map((y) => (
        <mesh key={`h-${y}`} position={longX ? [0, y, Math.sign(center.z || 1) * faceOffset] : [Math.sign(center.x || 1) * faceOffset, y, 0]}>
          <boxGeometry args={longX ? [size.x + 0.08, 0.055, 0.08] : [0.08, 0.055, size.z + 0.08]} />
          <meshStandardMaterial color="#dff6ff" emissive="#7dd3fc" emissiveIntensity={0.18} roughness={0.38} />
        </mesh>
      ))}
      {verticalOffsets.map((offset) => (
        <mesh key={`v-${offset}`} position={longX ? [offset, size.y / 2, Math.sign(center.z || 1) * faceOffset] : [Math.sign(center.x || 1) * faceOffset, size.y / 2, offset]}>
          <boxGeometry args={longX ? [0.055, size.y, 0.08] : [0.08, size.y, 0.055]} />
          <meshStandardMaterial color="#bfdbfe" emissive="#60a5fa" emissiveIntensity={0.12} roughness={0.42} />
        </mesh>
      ))}
    </group>
  );
}

function BlueprintLadder({ collider }: { collider: ArenaCollider }) {
  const normal = collider.ladderNormal ?? { x: 0, z: 1 };
  const height = collider.size.y;
  const centerY = collider.center.y;
  const rungCount = Math.max(5, Math.floor(height / 0.68));
  const rungStart = -height / 2 + 0.42;
  const zFacing = Math.abs(normal.z) >= Math.abs(normal.x);
  return (
    <group position={[collider.center.x, centerY, collider.center.z]}>
      {[-0.72, 0.72].map((offset) => (
        <mesh key={offset} position={zFacing ? [offset, 0, normal.z * 0.14] : [normal.x * 0.14, 0, offset]} castShadow>
          <boxGeometry args={zFacing ? [0.16, height, 0.16] : [0.16, height, 0.16]} />
          <meshStandardMaterial color="#e0f2fe" emissive="#38bdf8" emissiveIntensity={0.16} roughness={0.42} metalness={0.08} />
        </mesh>
      ))}
      {Array.from({ length: rungCount }, (_, i) => (
        <mesh key={i} position={zFacing ? [0, rungStart + i * 0.68, normal.z * 0.2] : [normal.x * 0.2, rungStart + i * 0.68, 0]} castShadow>
          <boxGeometry args={zFacing ? [1.7, 0.12, 0.16] : [0.16, 0.12, 1.7]} />
          <meshStandardMaterial color="#ffffff" emissive="#bae6fd" emissiveIntensity={0.14} roughness={0.36} metalness={0.08} />
        </mesh>
      ))}
    </group>
  );
}

function BankHeistDetails() {
  const colliders = ARENAS["Bank Heist"].colliders;
  const glass = colliders.filter((collider) => collider.id.includes("atrium-glass"));
  return (
    <group>
      <BankFloorGrout colliders={colliders} />
      <BankWallFinish colliders={colliders} />
      <BankAtriumGarden />
      {glass.map((collider) => <BankAtriumGlass key={collider.id} collider={collider} />)}
      <BankHallLights />
    </group>
  );
}

function BankFloorGrout({ colliders }: { colliders: ArenaCollider[] }) {
  const tileSurfaces = colliders.filter((collider) => collider.id.includes("-surface-") && collider.color.toLowerCase() === bankTileColor);
  return (
    <group>
      {tileSurfaces.map((collider) => <BankSurfaceGrout key={`grout-${collider.id}`} collider={collider} />)}
    </group>
  );
}

function BankSurfaceGrout({ collider }: { collider: ArenaCollider }) {
  const spacing = 2;
  const lineWidth = 0.035;
  const topY = collider.center.y + collider.size.y / 2 + 0.018;
  const minX = collider.center.x - collider.size.x / 2;
  const maxX = collider.center.x + collider.size.x / 2;
  const minZ = collider.center.z - collider.size.z / 2;
  const maxZ = collider.center.z + collider.size.z / 2;
  const xLines = positionsBetween(minX, maxX, spacing);
  const zLines = positionsBetween(minZ, maxZ, spacing);
  return (
    <group>
      {xLines.map((x) => (
        <mesh key={`x-${x}`} position={[x, topY, collider.center.z]} receiveShadow>
          <boxGeometry args={[lineWidth, 0.012, collider.size.z + bankSurfaceOverlap]} />
          <meshStandardMaterial color="#b8b3aa" roughness={0.84} metalness={0.01} />
        </mesh>
      ))}
      {zLines.map((z) => (
        <mesh key={`z-${z}`} position={[collider.center.x, topY, z]} receiveShadow>
          <boxGeometry args={[collider.size.x + bankSurfaceOverlap, 0.012, lineWidth]} />
          <meshStandardMaterial color="#b8b3aa" roughness={0.84} metalness={0.01} />
        </mesh>
      ))}
    </group>
  );
}

function positionsBetween(min: number, max: number, spacing: number) {
  const start = Math.ceil(min / spacing) * spacing;
  const positions: number[] = [];
  for (let position = start; position <= max + 0.001; position += spacing) {
    positions.push(Number(position.toFixed(3)));
  }
  return positions;
}

function BankWallFinish({ colliders }: { colliders: ArenaCollider[] }) {
  const walls = colliders.filter((collider) => (
    collider.id.startsWith("bank-")
    && !collider.id.includes("atrium-glass")
    && (
      collider.id.includes("-exterior-")
      || collider.id.includes("-ring-")
      || collider.id.includes("-stair-north-wrap")
      || collider.id.includes("-stair-south-wrap")
      || collider.id.includes("-stair-back")
      || collider.id.includes("-door-")
      || collider.id.includes("-lintel")
    )
  ));
  return (
    <group>
      {walls.map((collider) => <BankWallFace key={`finish-${collider.id}`} collider={collider} />)}
    </group>
  );
}

function BankWallFace({ collider }: { collider: ArenaCollider }) {
  const { center, size } = collider;
  const longX = size.x >= size.z;
  const isStone = collider.color.toLowerCase() === "#8f9699" || collider.id.includes("-lintel");
  const faceColor = isStone ? "#b1b7b7" : "#a8734b";
  const trimColor = isStone ? "#d4d1ca" : "#c59a72";
  const floorY = center.y - size.y / 2;
  const panelHeight = Math.max(0.7, size.y - 0.68);
  const panelY = floorY + 0.34 + panelHeight / 2;
  const railYs = [floorY + 1.55, floorY + 3.05].filter((y) => y < floorY + size.y - 0.5);
  const sides = [-1, 1];
  return (
    <group position={[center.x, 0, center.z]}>
      {sides.map((side) => {
        const facePosition: [number, number, number] = longX ? [0, panelY, side * (size.z / 2 + 0.024)] : [side * (size.x / 2 + 0.024), panelY, 0];
        return (
          <group key={side}>
            <mesh position={facePosition} receiveShadow>
              <boxGeometry args={longX ? [size.x + 0.02, panelHeight, 0.032] : [0.032, panelHeight, size.z + 0.02]} />
              <meshStandardMaterial color={faceColor} roughness={0.92} metalness={0.01} />
            </mesh>
            <mesh position={longX ? [0, floorY + 0.22, side * (size.z / 2 + 0.045)] : [side * (size.x / 2 + 0.045), floorY + 0.22, 0]}>
              <boxGeometry args={longX ? [size.x + 0.08, 0.18, 0.09] : [0.09, 0.18, size.z + 0.08]} />
              <meshStandardMaterial color={trimColor} roughness={0.72} metalness={0.02} />
            </mesh>
            {railYs.map((y) => (
              <mesh key={y} position={longX ? [0, y, side * (size.z / 2 + 0.05)] : [side * (size.x / 2 + 0.05), y, 0]}>
                <boxGeometry args={longX ? [size.x + 0.05, 0.045, 0.055] : [0.055, 0.045, size.z + 0.05]} />
                <meshStandardMaterial color={isStone ? "#979f9f" : "#8d5d3b"} roughness={0.86} metalness={0.01} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

function BankAtriumGlass({ collider }: { collider: ArenaCollider }) {
  const { center, size } = collider;
  return (
    <mesh position={[center.x, center.y, center.z]} scale={[size.x, size.y, size.z]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#9bc1cf" transparent opacity={0.35} roughness={0.18} metalness={0.02} depthWrite={false} />
    </mesh>
  );
}

function BankAtriumGarden() {
  return (
    <group>
      <mesh position={[0, 1.24, 0]} receiveShadow>
        <boxGeometry args={[12, 0.08, 12]} />
        <meshStandardMaterial color="#315533" roughness={0.9} />
      </mesh>
      <mesh position={[-3, 1.65, -2]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.8, 2]} />
        <meshStandardMaterial color="#486b3a" roughness={0.82} />
      </mesh>
      <mesh position={[4, 1.7, 3]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 1, 2]} />
        <meshStandardMaterial color="#486b3a" roughness={0.82} />
      </mesh>
    </group>
  );
}

function BankHallLights() {
  const fixtures = [
    { x: 0, z: -19, width: 9, depth: 0.4 },
    { x: 0, z: 19, width: 9, depth: 0.4 },
    { x: -15, z: 0, width: 0.4, depth: 9 },
    { x: 15, z: 0, width: 0.4, depth: 9 },
    { x: 32, z: 0, width: 0.4, depth: 7 }
  ];
  return (
    <group>
      {[4.25, 9.05].flatMap((y) => fixtures.map((fixture) => (
        <group key={`${y}-${fixture.x}-${fixture.z}`} position={[fixture.x, y, fixture.z]}>
          <mesh>
            <boxGeometry args={[fixture.width, 0.12, fixture.depth]} />
            <meshStandardMaterial color="#fff2cf" emissive="#fff2cf" emissiveIntensity={0.7} roughness={0.2} />
          </mesh>
          <pointLight color="#fff2cf" intensity={1.25} distance={24} decay={1.7} />
        </group>
      )))}
    </group>
  );
}

function ForestDetails() {
  const { trees = [], rocks = [] } = ARENAS.Forest;
  const colliders = ARENAS.Forest.colliders;
  const climberTrunks = colliders.filter((collider) => collider.id.startsWith("forest-climb-trunk"));
  const climberBranches = colliders.filter((collider) => collider.id.startsWith("forest-climb-branch"));
  const logs = colliders.filter((collider) => collider.id.startsWith("forest-log"));
  return (
    <group>
      <ForestGroundPatches />
      <ForestGrass />
      <ForestUnderstory />
      {trees.map((p, i) => <Tree key={`tree-${i}`} x={p.x} z={p.z} index={i} />)}
      {climberTrunks.map((trunk) => (
        <ClimberTree
          key={trunk.id}
          trunk={trunk}
          branches={climberBranches.filter((branch) => branch.id.startsWith(trunk.id.replace("trunk", "branch")))}
        />
      ))}
      {rocks.map((p, i) => (
        <group key={`rock-${i}`} position={[p.x, p.y, p.z]}>
          <mesh castShadow receiveShadow rotation={[0.18, i * 0.7, -0.1]}>
            <dodecahedronGeometry args={[1.8, 1]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#858f86" : "#747f7a"} roughness={0.92} />
          </mesh>
          <mesh position={[0.65, -0.1, -0.35]} castShadow receiveShadow rotation={[0.25, i, 0.2]}>
            <dodecahedronGeometry args={[0.9, 0]} />
            <meshStandardMaterial color="#9aa197" roughness={0.9} />
          </mesh>
        </group>
      ))}
      {logs.map((log, i) => <ForestLog key={log.id} collider={log} index={i} />)}
    </group>
  );
}

function Tree({ x, z, index }: { x: number; z: number; index: number }) {
  const scale = 0.92 + (index % 4) * 0.06;
  const crownA = ["#1f7138", "#267f3d", "#2c8a48", "#1d6840"][index % 4];
  const crownB = ["#2f9a4c", "#3b9f48", "#2d8f55", "#4a9a3f"][index % 4];
  return (
    <group position={[x, 0, z]} rotation={[0, index * 0.37, 0]} scale={[scale, scale, scale]}>
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.52, 0.68, 2.5, 7]} />
        <meshStandardMaterial color={index % 2 === 0 ? "#684026" : "#5a371f"} roughness={0.88} />
      </mesh>
      <mesh position={[0, 3.25, 0]} castShadow>
        <coneGeometry args={[2.65, 3.45, 8]} />
        <meshStandardMaterial color={crownA} roughness={0.88} />
      </mesh>
      <mesh position={[0, 4.75, 0]} castShadow>
        <coneGeometry args={[1.9, 2.65, 8]} />
        <meshStandardMaterial color={crownB} roughness={0.86} />
      </mesh>
      <mesh position={[0.3, 4.05, -0.2]} castShadow>
        <sphereGeometry args={[1.35, 8, 6]} />
        <meshStandardMaterial color={crownA} roughness={0.9} />
      </mesh>
    </group>
  );
}

function ClimberTree({ trunk, branches }: { trunk: ArenaCollider; branches: ArenaCollider[] }) {
  const trunkParts = trunk.id.split("-");
  const treeIndex = Number(trunkParts[trunkParts.length - 1] ?? 0);
  return (
    <group>
      <mesh position={[trunk.center.x, trunk.center.y, trunk.center.z]} castShadow receiveShadow>
        <cylinderGeometry args={[0.48, 0.72, trunk.size.y, 10]} />
        <meshStandardMaterial color="#58331d" roughness={0.9} />
      </mesh>
      <mesh position={[trunk.center.x, 15.8, trunk.center.z]} castShadow>
        <sphereGeometry args={[3.4, 12, 8]} />
        <meshStandardMaterial color={treeIndex % 2 === 0 ? "#1f6f3c" : "#285f35"} roughness={0.92} />
      </mesh>
      <mesh position={[trunk.center.x + 0.6, 13.8, trunk.center.z - 0.4]} castShadow>
        <coneGeometry args={[3.1, 5.2, 9]} />
        <meshStandardMaterial color={treeIndex % 2 === 0 ? "#2f8845" : "#347b40"} roughness={0.9} />
      </mesh>
      {branches.sort((a, b) => a.center.y - b.center.y).map((branch, branchIndex) => (
        <ClimberBranch key={branch.id} branch={branch} trunk={trunk} branchIndex={branchIndex} />
      ))}
    </group>
  );
}

function ClimberBranch({ branch, trunk, branchIndex }: { branch: ArenaCollider; trunk: ArenaCollider; branchIndex: number }) {
  const dx = branch.center.x - trunk.center.x;
  const dz = branch.center.z - trunk.center.z;
  const angle = Math.atan2(dz, dx);
  const length = Math.max(branch.size.x, branch.size.z) + 1.05;
  const midX = trunk.center.x + dx * 0.55;
  const midZ = trunk.center.z + dz * 0.55;
  const y = branch.center.y + branch.size.y * 0.45;
  return (
    <group>
      <mesh position={[midX, y, midZ]} rotation={[0.16, -angle, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.34, length, 8]} />
        <meshStandardMaterial color={branchIndex % 2 === 0 ? "#654026" : "#754a2d"} roughness={0.9} />
      </mesh>
      <mesh position={[branch.center.x, y + 0.1, branch.center.z]} rotation={[0, -angle, 0]} castShadow receiveShadow>
        <boxGeometry args={[branch.size.x, 0.24, branch.size.z]} />
        <meshStandardMaterial color={branch.color} roughness={0.86} />
      </mesh>
      <mesh position={[branch.center.x + Math.cos(angle) * 0.8, y + 0.45, branch.center.z + Math.sin(angle) * 0.8]} castShadow>
        <sphereGeometry args={[0.72, 8, 6]} />
        <meshStandardMaterial color={branchIndex % 2 === 0 ? "#2e8b45" : "#3f934a"} roughness={0.9} />
      </mesh>
    </group>
  );
}

function ForestLog({ collider, index }: { collider: ArenaCollider; index: number }) {
  return (
    <group position={[collider.center.x, collider.center.y, collider.center.z]} rotation={[0, index % 2 === 0 ? 0.08 : -0.16, Math.PI / 2]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[collider.size.z * 0.42, collider.size.z * 0.48, collider.size.x, 12]} />
        <meshStandardMaterial color="#765239" roughness={0.9} />
      </mesh>
      <mesh position={[0, collider.size.x * 0.5 + 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[collider.size.z * 0.43, collider.size.z * 0.43, 0.08, 12]} />
        <meshStandardMaterial color="#b2875d" roughness={0.82} />
      </mesh>
      <mesh position={[0, -collider.size.x * 0.5 - 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[collider.size.z * 0.43, collider.size.z * 0.43, 0.08, 12]} />
        <meshStandardMaterial color="#b2875d" roughness={0.82} />
      </mesh>
    </group>
  );
}

type GrassBlade = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  color: THREE.Color;
};

function ForestGrass() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const blades = useMemo(() => makeGrassBlades(1900), []);
  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    blades.forEach((blade, i) => {
      quaternion.setFromEuler(blade.rotation);
      matrix.compose(blade.position, quaternion, blade.scale);
      instanced.setMatrixAt(i, matrix);
      instanced.setColorAt(i, blade.color);
    });
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, [blades]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, blades.length]} castShadow receiveShadow>
      <coneGeometry args={[0.055, 1, 3]} />
      <meshStandardMaterial roughness={0.96} vertexColors />
    </instancedMesh>
  );
}

function ForestGroundPatches() {
  const patches = useMemo(() => makeGrassPatches(), []);
  return (
    <group>
      {patches.map((patch, i) => (
        <mesh
          key={i}
          position={[patch.x, 0.018 + i * 0.0002, patch.z]}
          rotation={[-Math.PI / 2, 0, patch.rotation]}
          scale={[patch.scaleX, patch.scaleZ, 1]}
          receiveShadow
        >
          <circleGeometry args={[1, 28]} />
          <meshStandardMaterial color={patch.color} roughness={1} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function ForestUnderstory() {
  const clusters = useMemo(() => [
    { x: -31, z: 6, s: 1.1 }, { x: -24, z: -28, s: 0.9 }, { x: 16, z: 24, s: 1.2 }, { x: 32, z: -6, s: 0.85 },
    { x: -6, z: -30, s: 1 }, { x: 38, z: 32, s: 0.95 }, { x: -42, z: 22, s: 0.8 }, { x: 6, z: 39, s: 1.05 }
  ], []);
  return (
    <group>
      {clusters.map((cluster, i) => (
        <group key={i} position={[cluster.x, 0, cluster.z]} scale={[cluster.s, cluster.s, cluster.s]} rotation={[0, i * 0.63, 0]}>
          {[0, 1, 2].map((leaf) => (
            <mesh key={leaf} position={[Math.cos(leaf * 2.1) * 0.45, 0.55, Math.sin(leaf * 2.1) * 0.45]} rotation={[0.4, leaf * 2.1, -0.25]} castShadow>
              <coneGeometry args={[0.38, 1.2, 5]} />
              <meshStandardMaterial color={leaf % 2 === 0 ? "#3f8b35" : "#5c9638"} roughness={0.95} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function makeSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeGrassBlades(count: number): GrassBlade[] {
  const random = makeSeededRandom(0x5eed3);
  const palette = ["#4f9a34", "#6aaa36", "#317a35", "#86a94a", "#9ca65a", "#255f31", "#74b84a"];
  const blocked = ARENAS.Forest.colliders.filter((collider) =>
    collider.id.startsWith("forest-tree")
    || collider.id.startsWith("forest-climb-trunk")
    || collider.id.startsWith("forest-rock")
    || collider.id.startsWith("forest-log")
    || collider.id.startsWith("forest-hill")
  );
  const blades: GrassBlade[] = [];
  let attempts = 0;
  while (blades.length < count && attempts < count * 8) {
    attempts += 1;
    const x = (random() - 0.5) * 102;
    const z = (random() - 0.5) * 102;
    if (blocked.some((collider) => Math.abs(x - collider.center.x) < collider.size.x * 0.5 + 1.2 && Math.abs(z - collider.center.z) < collider.size.z * 0.5 + 1.2)) continue;
    const height = 0.28 + random() * 0.55;
    blades.push({
      position: new THREE.Vector3(x, height * 0.5, z),
      rotation: new THREE.Euler((random() - 0.5) * 0.32, random() * Math.PI * 2, (random() - 0.5) * 0.32),
      scale: new THREE.Vector3(0.75 + random() * 0.8, height, 0.75 + random() * 0.8),
      color: new THREE.Color(palette[Math.floor(random() * palette.length)])
    });
  }
  return blades;
}

function makeGrassPatches() {
  const random = makeSeededRandom(0xf0e57);
  const colors = ["#5aa23a", "#7cab3e", "#3d8137", "#8f9d48", "#60933f", "#a4a45f"];
  return Array.from({ length: 42 }, () => ({
    x: (random() - 0.5) * 98,
    z: (random() - 0.5) * 98,
    scaleX: 3.6 + random() * 8.5,
    scaleZ: 2.2 + random() * 6.5,
    rotation: random() * Math.PI,
    color: colors[Math.floor(random() * colors.length)]
  }));
}

function SubwayDetails() {
  return (
    <group>
      <SubwayTracks />
      <SubwayPlatforms />
      <SubwayStationWalls />
      <SubwayLighting />
      <StreetMarkings />
      <SubwayEntrances />
      <SubwaySigns />
      <SubwayTrain x={-6} z={-27} route="A" />
      <SubwayTrain x={6} z={27} route="7" />
      {[-48, -36, -24, -12, 0, 12, 24, 36, 48].map((z) => (
        <ColumnWrap key={z} x={0} z={z} route={z % 24 === 0 ? "4" : "N"} />
      ))}
      <StreetProps />
    </group>
  );
}

function SubwayTracks() {
  const ties = Array.from({ length: 23 }, (_, i) => -55 + i * 5);
  return (
    <group>
      {[-6, 6].map((trackX) => (
        <group key={trackX}>
          {[-2.7, 2.7].map((railOffset) => (
            <mesh key={railOffset} position={[trackX + railOffset, 0.12, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.18, 0.24, 112]} />
              <meshStandardMaterial color="#c4cad4" emissive="#8d949f" emissiveIntensity={0.15} roughness={0.32} metalness={0.68} />
            </mesh>
          ))}
          {ties.map((z) => (
            <mesh key={z} position={[trackX, 0.08, z]} receiveShadow>
              <boxGeometry args={[7.2, 0.16, 0.55]} />
              <meshStandardMaterial color="#9a7047" emissive="#5b351f" emissiveIntensity={0.18} roughness={0.78} />
            </mesh>
          ))}
          <mesh position={[trackX, 0.025, 0]} receiveShadow>
            <boxGeometry args={[7.8, 0.05, 112]} />
            <meshStandardMaterial color="#686f76" roughness={0.9} />
          </mesh>
          <mesh position={[trackX + 4.55, 0.23, 0]} castShadow>
            <boxGeometry args={[0.36, 0.22, 108]} />
            <meshStandardMaterial color="#c8552b" roughness={0.62} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.035, 0]} receiveShadow>
        <boxGeometry args={[1.8, 0.07, 112]} />
        <meshStandardMaterial color="#626970" roughness={0.92} />
      </mesh>
    </group>
  );
}

function SubwayPlatforms() {
  return (
    <group>
      {[-11.05, 11.05].map((x) => (
        <mesh key={x} position={[x, 1.34, 0]} receiveShadow>
          <boxGeometry args={[0.7, 0.08, 108]} />
          <meshStandardMaterial color="#ffd23f" emissive="#f5c518" emissiveIntensity={0.08} roughness={0.58} />
        </mesh>
      ))}
      {[-16.5, 16.5].map((x) => (
        <group key={x}>
          {Array.from({ length: 18 }, (_, i) => (
            <mesh key={i} position={[x, 1.36, -51 + i * 6]} receiveShadow>
              <boxGeometry args={[8.8, 0.035, 0.08]} />
              <meshStandardMaterial color="#b8b1a7" roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function SubwayStationWalls() {
  return (
    <group>
      {[-23.5, 23.5].map((wallX) => {
        const faceX = wallX - Math.sign(wallX) * 0.36;
        return (
          <group key={wallX}>
            <mesh position={[faceX, 3.65, 0]} receiveShadow>
              <boxGeometry args={[0.08, 4.35, 104]} />
              <meshStandardMaterial color="#f0efe9" roughness={0.28} metalness={0.02} />
            </mesh>
            <mesh position={[faceX - Math.sign(wallX) * 0.05, 3.05, 0]}>
              <boxGeometry args={[0.12, 0.24, 104]} />
              <meshStandardMaterial color="#2850ad" emissive="#2850ad" emissiveIntensity={0.05} roughness={0.44} />
            </mesh>
            {[-42, -18, 18, 42].map((z) => (
              <StationName key={z} x={faceX - Math.sign(wallX) * 0.08} z={z} rotationY={wallX > 0 ? -Math.PI / 2 : Math.PI / 2} />
            ))}
          </group>
        );
      })}
    </group>
  );
}

function StationName({ x, z, rotationY }: { x: number; z: number; rotationY: number }) {
  return (
    <group position={[x, 3.2, z]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[5.2, 0.9, 0.08]} />
        <meshStandardMaterial color="#111111" roughness={0.5} />
      </mesh>
      <Text position={[0, 0.02, 0.055]} fontSize={0.34} color="#ffffff" anchorX="center" anchorY="middle">
        14 ST - UNION SQ
      </Text>
    </group>
  );
}

function SubwayLighting() {
  const lightRows = [-24, -6, 12, 30];
  const fixtures = [-16, 0, 16].flatMap((x) => lightRows
    .filter((z) => !(Math.abs(x) >= 16 && Math.abs(z) >= 23))
    .map((z) => ({ x, z })));
  return (
    <group>
      {fixtures.map(({ x, z }) => (
        <group key={`${x}-${z}`} position={[x, 6.55, z]}>
          <mesh receiveShadow>
            <boxGeometry args={[6.15, 0.12, 1.02]} />
            <meshStandardMaterial color="#1a1e22" roughness={0.64} metalness={0.18} />
          </mesh>
          <mesh position={[0, -0.075, 0]}>
            <boxGeometry args={[5.65, 0.045, 0.62]} />
            <meshStandardMaterial color="#f6f7e9" emissive="#f6f7e9" emissiveIntensity={0.8} roughness={0.18} />
          </mesh>
          <pointLight color="#f6f7e9" intensity={0.18} distance={15} position={[0, -0.18, 0]} />
        </group>
      ))}
      {[-6, 6].map((x) => [-36, -12, 12, 36].map((z) => (
        <pointLight key={`track-${x}-${z}`} color="#dfe7dd" intensity={0.08} distance={12} position={[x, 3.15, z]} />
      )))}
    </group>
  );
}

function StreetMarkings() {
  return (
    <group>
      {[-41, 0, 41].map((z) => (
        <mesh key={`yellow-z-${z}`} position={[0, 7.03, z]} receiveShadow>
          <boxGeometry args={[1.2, 0.035, 10]} />
          <meshStandardMaterial color="#f5c518" roughness={0.6} />
        </mesh>
      ))}
      {[-41, 0, 41].map((x) => (
        <mesh key={`yellow-x-${x}`} position={[x, 7.035, 0]} receiveShadow>
          <boxGeometry args={[10, 0.035, 1.2]} />
          <meshStandardMaterial color="#f5c518" roughness={0.6} />
        </mesh>
      ))}
      {[-22, 22].flatMap((z) => [-8, -4, 0, 4, 8].map((x) => (
        <mesh key={`cross-z-${z}-${x}`} position={[x, 7.05, z]} receiveShadow>
          <boxGeometry args={[2.4, 0.04, 0.55]} />
          <meshStandardMaterial color="#e8e8e0" roughness={0.54} />
        </mesh>
      )))}
      {[-22, 22].flatMap((x) => [-8, -4, 0, 4, 8].map((z) => (
        <mesh key={`cross-x-${x}-${z}`} position={[x, 7.055, z]} receiveShadow>
          <boxGeometry args={[0.55, 0.04, 2.4]} />
          <meshStandardMaterial color="#e8e8e0" roughness={0.54} />
        </mesh>
      )))}
      {[-16, 16].flatMap((x) => [-16, 16].map((z) => (
        <mesh key={`manhole-${x}-${z}`} position={[x, 7.075, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.05, 1.05, 0.06, 36]} />
          <meshStandardMaterial color="#464a4e" roughness={0.7} metalness={0.22} />
        </mesh>
      )))}
    </group>
  );
}

function SubwayEntrances() {
  return (
    <group>
      {[-1, 1].flatMap((side) => [-1, 1].map((zSign) => (
        <group key={`${side}-${zSign}`}>
          <Entrance x={side * 16.5} z={zSign * 23.2} zSign={zSign} />
        </group>
      )))}
    </group>
  );
}

function Entrance({ x, z, zSign }: { x: number; z: number; zSign: number }) {
  const green = "#14532d";
  const lampGreen = "#2bb24c";
  const frontZ = -16.8;
  const backZ = -0.8;
  const sideRailZ = (frontZ + backZ) / 2;
  const sideRailLength = backZ - frontZ;
  const sidePosts = [frontZ, -12.8, -8.8, -4.8, backZ];
  const backPosts = [-2.35, 0, 2.35];

  return (
    <group position={[x, 7.05, z]} rotation={[0, zSign > 0 ? Math.PI : 0, 0]}>
      {[-4.65, 4.65].map((railX) => (
        <group key={railX}>
          <mesh position={[railX, 1.08, sideRailZ]} castShadow>
            <boxGeometry args={[0.18, 0.16, sideRailLength]} />
            <meshStandardMaterial color={green} roughness={0.54} metalness={0.18} />
          </mesh>
          <mesh position={[railX, 0.55, sideRailZ]} castShadow>
            <boxGeometry args={[0.12, 0.1, sideRailLength]} />
            <meshStandardMaterial color={green} roughness={0.54} metalness={0.18} />
          </mesh>
          {sidePosts.map((postZ) => (
            <mesh key={postZ} position={[railX, 0.57, postZ]} castShadow>
              <boxGeometry args={[0.18, 1.14, 0.18]} />
              <meshStandardMaterial color={green} roughness={0.54} metalness={0.18} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 1.08, backZ]} castShadow>
        <boxGeometry args={[9.45, 0.16, 0.18]} />
        <meshStandardMaterial color={green} roughness={0.54} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0.55, backZ]} castShadow>
        <boxGeometry args={[9.45, 0.1, 0.12]} />
        <meshStandardMaterial color={green} roughness={0.54} metalness={0.18} />
      </mesh>
      {backPosts.map((postX) => (
        <mesh key={postX} position={[postX, 0.57, backZ]} castShadow>
          <boxGeometry args={[0.18, 1.14, 0.18]} />
          <meshStandardMaterial color={green} roughness={0.54} metalness={0.18} />
        </mesh>
      ))}
      <mesh position={[0, 0.92, -1.0]} castShadow>
        <boxGeometry args={[3.9, 0.72, 0.14]} />
        <meshStandardMaterial color="#111111" roughness={0.38} />
      </mesh>
      <Text position={[0, 0.95, -0.91]} rotation={[0, 0, 0]} fontSize={0.34} color="#ffffff" anchorX="center" anchorY="middle">
        SUBWAY
      </Text>
      <Text position={[0, 0.95, -1.09]} rotation={[0, Math.PI, 0]} fontSize={0.34} color="#ffffff" anchorX="center" anchorY="middle">
        SUBWAY
      </Text>
      {[-5.15, 5.15].map((lampX) => (
        <group key={lampX} position={[lampX, 0, 1.9]}>
          <mesh position={[0, 1.45, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 2.9, 12]} />
            <meshStandardMaterial color={green} roughness={0.46} metalness={0.36} />
          </mesh>
          <mesh position={[0, 2.9, 0]} castShadow>
          <sphereGeometry args={[0.42, 20, 12]} />
            <meshStandardMaterial color={lampGreen} emissive={lampGreen} emissiveIntensity={0.75} roughness={0.2} />
          </mesh>
          <pointLight color={lampGreen} intensity={0.24} distance={7} position={[0, 2.9, 0]} />
        </group>
      ))}
    </group>
  );
}

function SubwaySigns() {
  const signs = [
    { x: -16.5, z: -18, routes: ["1", "2", "3"] },
    { x: 16.5, z: 18, routes: ["4", "5", "6"] },
    { x: -16.5, z: 44, routes: ["A", "C", "E"] },
    { x: 16.5, z: -44, routes: ["N", "Q", "R"] }
  ];
  return (
    <group>
      {signs.map((sign) => (
        <group key={`${sign.x}-${sign.z}`} position={[sign.x, 4.65, sign.z]}>
          <mesh castShadow>
            <boxGeometry args={[5.8, 1.1, 0.18]} />
            <meshStandardMaterial color="#050505" roughness={0.42} />
          </mesh>
          {sign.routes.map((route, i) => <RouteBullet key={route} route={route} x={-1.8 + i * 1.8} y={0} z={0.12} />)}
          <group rotation={[0, Math.PI, 0]}>
            {sign.routes.map((route, i) => <RouteBullet key={`${route}-back`} route={route} x={-1.8 + i * 1.8} y={0} z={0.12} />)}
          </group>
        </group>
      ))}
    </group>
  );
}

function ColumnWrap({ x, z, route }: { x: number; z: number; route: string }) {
  return (
    <group position={[x, 3.35, z]}>
      <mesh position={[0, 0, -0.72]}>
        <boxGeometry args={[1.5, 0.75, 0.08]} />
        <meshStandardMaterial color="#111111" roughness={0.45} />
      </mesh>
      <RouteBullet route={route} x={0} y={0} z={-0.78} />
    </group>
  );
}

function RouteBullet({ route, x, y, z }: { route: string; x: number; y: number; z: number }) {
  const color = routeColor(route);
  return (
    <group position={[x, y, z]}>
      <mesh>
        <circleGeometry args={[0.45, 28]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} roughness={0.4} />
      </mesh>
      <Text position={[0, 0, 0.025]} fontSize={0.42} color={route === "N" || route === "Q" || route === "R" ? "#111111" : "#ffffff"} anchorX="center" anchorY="middle">
        {route}
      </Text>
    </group>
  );
}

function routeColor(route: string) {
  if (["1", "2", "3"].includes(route)) return "#ee352e";
  if (["4", "5", "6"].includes(route)) return "#00933c";
  if (route === "7") return "#b933ad";
  if (["A", "C", "E"].includes(route)) return "#2850ad";
  if (["B", "D", "F", "M"].includes(route)) return "#ff6319";
  if (["N", "Q", "R", "W"].includes(route)) return "#fccc0a";
  if (route === "G") return "#6cbe45";
  return "#a7a9ac";
}

function SubwayTrain({ x, z, route }: { x: number; z: number; route: string }) {
  return (
    <group position={[x, 1.65, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[6.4, 3.3, 25]} />
        <meshStandardMaterial color="#b8bcc2" roughness={0.32} metalness={0.48} />
      </mesh>
      <mesh position={[0, 0.78, -12.6]}>
        <boxGeometry args={[4.8, 1.15, 0.1]} />
        <meshStandardMaterial color="#1c2733" emissive="#102030" emissiveIntensity={0.12} roughness={0.22} />
      </mesh>
      {[-8, -4, 0, 4, 8].map((windowZ) => (
        <mesh key={windowZ} position={[3.24, 0.65, windowZ]}>
          <boxGeometry args={[0.1, 0.9, 2.2]} />
          <meshStandardMaterial color="#1c2733" emissive="#102030" emissiveIntensity={0.08} roughness={0.25} />
        </mesh>
      ))}
      {[-6, 6].map((doorZ) => (
        <mesh key={doorZ} position={[3.3, -0.25, doorZ]}>
          <boxGeometry args={[0.08, 2.25, 1.6]} />
          <meshStandardMaterial color="#d8dce0" roughness={0.36} metalness={0.42} />
        </mesh>
      ))}
      <mesh position={[3.33, 0.18, 0]}>
        <boxGeometry args={[0.08, 0.18, 22]} />
        <meshStandardMaterial color="#0039a6" roughness={0.4} />
      </mesh>
      <mesh position={[3.34, -0.08, 0]}>
        <boxGeometry args={[0.08, 0.16, 22]} />
        <meshStandardMaterial color="#ee352e" roughness={0.4} />
      </mesh>
      <group position={[0, 0.72, -12.72]}>
        <RouteBullet route={route} x={0} y={0} z={0} />
      </group>
    </group>
  );
}

function StreetProps() {
  return (
    <group>
      {[
        [-28, -10], [28, 10]
      ].map(([x, z]) => (
        <TrafficLight key={`${x}-${z}`} x={x} z={z} />
      ))}
      <mesh position={[-12, 7.55, 18]} castShadow>
        <cylinderGeometry args={[0.28, 0.34, 1, 16]} />
        <meshStandardMaterial color="#f5c518" roughness={0.48} />
      </mesh>
      <mesh position={[-12, 8.15, 18]} castShadow>
        <sphereGeometry args={[0.38, 16, 10]} />
        <meshStandardMaterial color="#f5c518" roughness={0.48} />
      </mesh>
    </group>
  );
}

function TrafficLight({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 7.0, z]}>
      <mesh position={[0, 2.1, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 4.2, 10]} />
        <meshStandardMaterial color="#36404a" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0.85, 4.05, 0]} castShadow>
        <boxGeometry args={[1.2, 0.35, 0.28]} />
        <meshStandardMaterial color="#36404a" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[1.55, 3.65, 0]} castShadow>
        <boxGeometry args={[0.42, 1.05, 0.32]} />
        <meshStandardMaterial color="#1f2429" roughness={0.44} />
      </mesh>
      {[
        ["#ef4444", 3.95],
        ["#f5c518", 3.65],
        ["#22c55e", 3.35]
      ].map(([color, y]) => (
        <mesh key={color} position={[1.56, y as number, -0.18]}>
          <circleGeometry args={[0.11, 16]} />
          <meshStandardMaterial color={color as string} emissive={color as string} emissiveIntensity={0.45} roughness={0.28} />
        </mesh>
      ))}
    </group>
  );
}
