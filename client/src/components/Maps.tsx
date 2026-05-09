import type { MapName } from "@veck/shared";

function Tile({ position, scale, color = "#e7edf3" }: { position: [number, number, number]; scale: [number, number, number]; color?: string }) {
  return <mesh position={position} scale={scale} castShadow receiveShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={color} roughness={0.68} /></mesh>;
}

export function ArenaMap({ map }: { map: MapName }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80, 40, 40]} />
        <meshStandardMaterial color={map === "Forest" ? "#75bb4d" : "#d9e1e8"} roughness={0.9} />
      </mesh>
      <gridHelper args={[80, 40, "#ffffff", map === "Forest" ? "#5fa23e" : "#b9c4ce"]} position={[0, 0.02, 0]} />
      {map === "Pyramid" && <Pyramid />}
      {map === "Practice Range" && <Practice />}
      {map === "Forest" && <Forest />}
    </group>
  );
}

function Pyramid() {
  return (
    <group>
      {[0, 1, 2, 3, 4].map((i) => <Tile key={i} position={[0, 0.35 + i * 0.62, 0]} scale={[15 - i * 2.4, 0.7, 15 - i * 2.4]} color={i % 2 ? "#cfd8e3" : "#f2f5f8"} />)}
      {[-26, 26].map((x) => <Tile key={x} position={[x, 1.4, 0]} scale={[1.2, 2.8, 30]} color="#c8d1dc" />)}
      {[-26, 26].map((z) => <Tile key={z} position={[0, 1.4, z]} scale={[30, 2.8, 1.2]} color="#c8d1dc" />)}
      {[-16, 16].map((x) => [-16, 16].map((z) => <Tile key={`${x}${z}`} position={[x, 0.6, z]} scale={[5, 1.2, 1.4]} color="#f7f7f7" />))}
    </group>
  );
}

function Practice() {
  return (
    <group>
      <Tile position={[0, 0.5, 0]} scale={[8, 1, 8]} />
      <Tile position={[-14, 3.2, 14]} scale={[9, 1.1, 7]} color="#cbd5df" />
      <Tile position={[15, 4.8, -13]} scale={[9, 1.1, 7]} color="#f1f5f9" />
      <Tile position={[0, 6.3, 24]} scale={[15, 1, 5]} color="#cbd5df" />
      {[-18, -10, -2, 6, 14, 22].map((x, i) => <Tile key={x} position={[x, 0.8, -24 + (i % 2) * 8]} scale={[2.2, 1.6, 6]} color="#ffffff" />)}
      {[-28, 28].map((x) => <Tile key={x} position={[x, 3, 0]} scale={[1.2, 6, 54]} color="#d6dee7" />)}
      {[[-7, 1.7, 8], [8, 2.8, -7], [1, 4.2, 18]].map((p, i) => <Tile key={i} position={p as [number, number, number]} scale={[4, 0.5, 10]} color="#b7c2ce" />)}
    </group>
  );
}

function Forest() {
  const trees = [[-22, -18], [-15, 8], [-6, -22], [7, 16], [17, -12], [24, 20], [0, -3], [-26, 18], [20, 4]];
  return (
    <group>
      {trees.map(([x, z]) => <Tree key={`${x}${z}`} x={x} z={z} />)}
      {[[-9, 0], [10, -5], [4, 20], [-20, -2]].map(([x, z]) => <Tile key={`${x}${z}`} position={[x, 0.45, z]} scale={[5, 0.9, 2]} color="#8a8176" />)}
      <Tile position={[0, 1.2, 0]} scale={[8, 2.4, 8]} color="#6aa84f" />
      <Tile position={[0, 2.7, 0]} scale={[5.5, 0.7, 5.5]} color="#9ccc65" />
      {[[-14, -13], [14, 14], [24, -21]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 0.7, z]} castShadow receiveShadow><dodecahedronGeometry args={[1.6, 0]} /><meshStandardMaterial color="#899098" roughness={0.85} /></mesh>)}
    </group>
  );
}

function Tree({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Tile position={[0, 1.25, 0]} scale={[0.9, 2.5, 0.9]} color="#6b4226" />
      <mesh position={[0, 3.1, 0]} castShadow><coneGeometry args={[2.1, 3.2, 6]} /><meshStandardMaterial color="#238241" roughness={0.8} /></mesh>
      <mesh position={[0, 4.45, 0]} castShadow><coneGeometry args={[1.55, 2.4, 6]} /><meshStandardMaterial color="#2ea44f" roughness={0.8} /></mesh>
    </group>
  );
}
