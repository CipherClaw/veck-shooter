import { Text } from "@react-three/drei";
import { ARENAS, type ArenaBouncePad, type ArenaCollider, type MapName } from "@veck/shared";

function Tile({ collider }: { collider: ArenaCollider }) {
  const { center, size, color } = collider;
  return (
    <mesh position={[center.x, center.y, center.z]} scale={[size.x, size.y, size.z]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.74} metalness={0.02} />
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
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[arena.floorSize, arena.floorSize, 48, 48]} />
        <meshStandardMaterial color={arena.floorColor} roughness={0.88} />
      </mesh>
      <gridHelper args={[arena.floorSize, arena.floorSize / 4, "#fff7d6", arena.gridColor]} position={[0, 0.025, 0]} />
      {arena.colliders.filter((collider) => !hiddenCollider(collider.id)).map((collider) => <Tile key={collider.id} collider={collider} />)}
      {arena.bouncePads?.map((pad) => <BouncePad key={pad.id} pad={pad} />)}
      {map === "Pyramid" && <PyramidDetails />}
      {map === "Practice Range" && <PracticeDetails />}
      {map === "Forest" && <ForestDetails />}
      {map === "Subway" && <SubwayDetails />}
    </group>
  );
}

function hiddenCollider(id: string) {
  return id.startsWith("forest-tree")
    || id.startsWith("forest-rock")
    || id.startsWith("subway-train")
    || (id.startsWith("practice-corner-ladder") && !id.startsWith("practice-corner-ladder-strip"));
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
      {[-44, 44].flatMap((x) => [-51.95, 51.95].map((z) => <CornerLadder key={`${x}-${z}`} x={x} z={z} />))}
    </group>
  );
}

function CornerLadder({ x, z }: { x: number; z: number }) {
  const outsideZ = Math.sign(z) || 1;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 4.15, -outsideZ * 0.18]} castShadow receiveShadow>
        <boxGeometry args={[2.25, 8.3, 0.16]} />
        <meshStandardMaterial color="#30404d" roughness={0.72} metalness={0.04} />
      </mesh>
      {[-0.8, 0.8].map((railX) => (
        <mesh key={railX} position={[railX, 4.15, outsideZ * 0.08]} castShadow>
          <boxGeometry args={[0.22, 8.3, 0.22]} />
          <meshStandardMaterial color="#64717f" roughness={0.68} metalness={0.12} />
        </mesh>
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[0, 0.55 + i * 0.68, outsideZ * 0.16]} castShadow>
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
  return (
    <group>
      {[-16, 0, 16].map((x) => lightRows.map((z) => (
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
      )))}
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
      <Text position={[0, 0.95, -1.1]} rotation={[0, zSign > 0 ? Math.PI : 0, 0]} fontSize={0.34} color="#ffffff" anchorX="center" anchorY="middle">
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
