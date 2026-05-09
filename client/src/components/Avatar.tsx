import { Text } from "@react-three/drei";
import type { PlayerSnapshot } from "@veck/shared";
import { WeaponModel } from "./WeaponModels";

export function Avatar({ player, mine }: { player: PlayerSnapshot; mine: boolean }) {
  if (mine || !player.alive) return null;
  const color = player.team === "red" ? "#f05252" : player.team === "green" ? "#22c55e" : "#4f8cff";
  return (
    <group position={[player.position.x, player.position.y - 1.05, player.position.z]} rotation={[0, player.rotationY, 0]}>
      <Text position={[0, 2.8, 0]} fontSize={0.38} color="white" anchorX="center" outlineWidth={0.04} outlineColor="#111827">
        {player.name}
      </Text>
      <group position={[0, 1.25, 0]}>
        <mesh castShadow><boxGeometry args={[0.75, 1.05, 0.42]} /><meshStandardMaterial color={color} roughness={0.55} /></mesh>
        <mesh position={[0, 0.78, 0]} castShadow><boxGeometry args={[0.62, 0.55, 0.55]} /><meshStandardMaterial color="#ffd5a8" /></mesh>
        <mesh position={[-0.14, 0.85, -0.29]}><boxGeometry args={[0.08, 0.08, 0.04]} /><meshStandardMaterial color="#171717" /></mesh>
        <mesh position={[0.14, 0.85, -0.29]}><boxGeometry args={[0.08, 0.08, 0.04]} /><meshStandardMaterial color="#171717" /></mesh>
        <mesh position={[-0.58, 0.05, 0]} castShadow><boxGeometry args={[0.25, 0.9, 0.28]} /><meshStandardMaterial color="#ffd5a8" /></mesh>
        <mesh position={[0.58, 0.05, 0]} castShadow><boxGeometry args={[0.25, 0.9, 0.28]} /><meshStandardMaterial color="#ffd5a8" /></mesh>
        <mesh position={[-0.22, -0.9, 0]} castShadow><boxGeometry args={[0.28, 0.82, 0.3]} /><meshStandardMaterial color="#2f3440" /></mesh>
        <mesh position={[0.22, -0.9, 0]} castShadow><boxGeometry args={[0.28, 0.82, 0.3]} /><meshStandardMaterial color="#2f3440" /></mesh>
        <group position={[0.62, 0.08, -0.36]} rotation={[0.15, 0, 0]}>
          <WeaponModel weapon={player.weapon} />
        </group>
      </group>
    </group>
  );
}
