import { Billboard, Text } from "@react-three/drei";
import type { PlayerSnapshot } from "@veck/shared";
import { WeaponModel } from "./WeaponModels";

export function Avatar({ player, mine }: { player: PlayerSnapshot; mine: boolean }) {
  if (mine) return null;
  const color = player.team === "red" ? "#f05252" : player.team === "green" ? "#22c55e" : "#4f8cff";
  const healthRatio = Math.max(0, Math.min(1, player.health / 100));
  const healthColor = healthRatio > 0.5 ? "#22c55e" : healthRatio > 0.25 ? "#facc15" : "#ef4444";
  const bodyPosition: [number, number, number] = player.alive ? [0, 1.25, 0] : [0, 0.42, 0];
  const bodyRotation: [number, number, number] = player.alive ? [0, player.rotationY, 0] : [Math.PI / 2, player.rotationY, 0];
  return (
    <group position={[player.position.x, player.position.y - 1.05, player.position.z]}>
      <Billboard position={[0, 3.05, 0]} follow lockX={false} lockY={false} lockZ={false}>
        <Text fontSize={0.42} color="white" anchorX="center" anchorY="middle" outlineWidth={0.045} outlineColor="#111827">
          {player.name}
        </Text>
        {player.alive && (
          <group position={[0, -0.34, 0]}>
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[1.35, 0.16]} />
              <meshBasicMaterial color="#111827" transparent opacity={0.86} />
            </mesh>
            <mesh position={[-(1 - healthRatio) * 0.625, 0, 0]} scale={[healthRatio, 1, 1]}>
              <planeGeometry args={[1.25, 0.08]} />
              <meshBasicMaterial color={healthColor} />
            </mesh>
          </group>
        )}
      </Billboard>
      <group position={bodyPosition} rotation={bodyRotation}>
        <mesh castShadow><boxGeometry args={[0.75, 1.05, 0.42]} /><meshStandardMaterial color={color} roughness={0.55} /></mesh>
        <mesh position={[0, 0.78, 0]} castShadow><boxGeometry args={[0.62, 0.55, 0.55]} /><meshStandardMaterial color="#ffd5a8" /></mesh>
        <mesh position={[-0.14, 0.85, -0.29]}><boxGeometry args={[0.08, 0.08, 0.04]} /><meshStandardMaterial color="#171717" /></mesh>
        <mesh position={[0.14, 0.85, -0.29]}><boxGeometry args={[0.08, 0.08, 0.04]} /><meshStandardMaterial color="#171717" /></mesh>
        <mesh position={[-0.58, 0.2, 0]} castShadow><boxGeometry args={[0.27, 0.55, 0.3]} /><meshStandardMaterial color={color} roughness={0.58} /></mesh>
        <mesh position={[0.58, 0.2, 0]} castShadow><boxGeometry args={[0.27, 0.55, 0.3]} /><meshStandardMaterial color={color} roughness={0.58} /></mesh>
        <mesh position={[-0.58, -0.18, -0.02]} castShadow><boxGeometry args={[0.23, 0.32, 0.25]} /><meshStandardMaterial color="#ffd5a8" roughness={0.72} /></mesh>
        <mesh position={[0.58, -0.18, -0.02]} castShadow><boxGeometry args={[0.23, 0.32, 0.25]} /><meshStandardMaterial color="#ffd5a8" roughness={0.72} /></mesh>
        <mesh position={[-0.22, -0.9, 0]} castShadow><boxGeometry args={[0.28, 0.82, 0.3]} /><meshStandardMaterial color="#2f3440" /></mesh>
        <mesh position={[0.22, -0.9, 0]} castShadow><boxGeometry args={[0.28, 0.82, 0.3]} /><meshStandardMaterial color="#2f3440" /></mesh>
        <group position={[0.62, 0.08, -0.36]} rotation={[0.15, 0, 0]}>
          <WeaponModel weapon={player.weapon} />
        </group>
      </group>
    </group>
  );
}
