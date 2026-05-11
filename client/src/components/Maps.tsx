import { ARENAS, type ArenaCollider, type MapName } from "@veck/shared";

function Tile({ collider }: { collider: ArenaCollider }) {
  const { center, size, color } = collider;
  return (
    <mesh position={[center.x, center.y, center.z]} scale={[size.x, size.y, size.z]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.74} metalness={0.02} />
    </mesh>
  );
}

export function ArenaMap({ map }: { map: MapName }) {
  const arena = ARENAS[map];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[arena.floorSize, arena.floorSize, 48, 48]} />
        <meshStandardMaterial color={arena.floorColor} roughness={0.88} />
      </mesh>
      <gridHelper args={[arena.floorSize, arena.floorSize / 4, "#fff7d6", arena.gridColor]} position={[0, 0.025, 0]} />
      {arena.colliders.filter((collider) => !hiddenCollider(collider.id)).map((collider) => <Tile key={collider.id} collider={collider} />)}
      {map === "Pyramid" && <PyramidDetails />}
      {map === "Practice Range" && <PracticeDetails />}
      {map === "Forest" && <ForestDetails />}
    </group>
  );
}

function hiddenCollider(id: string) {
  return id.startsWith("forest-tree") || id.startsWith("forest-rock") || id.startsWith("practice-corner-ladder");
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
  return (
    <group>
      {[-40, -20, 0, 20, 40].map((x, i) => (
        <group key={x} position={[x, 0.05, 52 - i * 6]}>
          <mesh position={[0, 1.8, 0]} castShadow>
            <boxGeometry args={[2.4, 3.6, 0.35]} />
            <meshStandardMaterial color="#ef4444" roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.8, -0.22]} castShadow>
            <circleGeometry args={[0.55, 24]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.5} />
          </mesh>
        </group>
      ))}
      {[-48, 48].flatMap((x) => [-48, 48].map((z) => <CornerLadder key={`${x}-${z}`} x={x} z={z} />))}
    </group>
  );
}

function CornerLadder({ x, z }: { x: number; z: number }) {
  const rotationY = z > 0 ? 0 : Math.PI;
  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      {[-0.8, 0.8].map((railX) => (
        <mesh key={railX} position={[railX, 4.15, 0]} castShadow>
          <boxGeometry args={[0.22, 8.3, 0.22]} />
          <meshStandardMaterial color="#64717f" roughness={0.68} metalness={0.12} />
        </mesh>
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[0, 0.55 + i * 0.68, 0.02]} castShadow>
          <boxGeometry args={[1.9, 0.16, 0.2]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.08} />
        </mesh>
      ))}
    </group>
  );
}

function ForestDetails() {
  const { trees = [], rocks = [] } = ARENAS.Forest;
  return (
    <group>
      {trees.map((p, i) => <Tree key={`tree-${i}`} x={p.x} z={p.z} />)}
      {rocks.map((p, i) => (
        <mesh key={`rock-${i}`} position={[p.x, p.y, p.z]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1.8, 0]} />
          <meshStandardMaterial color="#899098" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Tree({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 2.5, 0.9]} />
        <meshStandardMaterial color="#6b4226" roughness={0.78} />
      </mesh>
      <mesh position={[0, 3.25, 0]} castShadow>
        <coneGeometry args={[2.45, 3.3, 6]} />
        <meshStandardMaterial color="#238241" roughness={0.8} />
      </mesh>
      <mesh position={[0, 4.75, 0]} castShadow>
        <coneGeometry args={[1.8, 2.55, 6]} />
        <meshStandardMaterial color="#2ea44f" roughness={0.8} />
      </mesh>
    </group>
  );
}
