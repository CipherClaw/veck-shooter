import type { WeaponId } from "@veck/shared";

export function WeaponModel({ weapon, firstPerson = false }: { weapon: WeaponId; firstPerson?: boolean }) {
  const scale = firstPerson ? 1 : 0.55;
  if (weapon === "sniper") {
    return (
      <group scale={scale}>
        <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[0.22, 0.22, 1.9]} /><meshStandardMaterial color="#23262d" /></mesh>
        <mesh position={[0, 0.2, -0.1]} castShadow><boxGeometry args={[0.36, 0.2, 0.58]} /><meshStandardMaterial color="#111318" /></mesh>
        <mesh position={[0, -0.18, 0.48]} castShadow><boxGeometry args={[0.18, 0.44, 0.2]} /><meshStandardMaterial color="#7a4d2d" /></mesh>
        <mesh position={[0, 0.03, -1.15]} castShadow><cylinderGeometry args={[0.07, 0.07, 0.8, 12]} /><meshStandardMaterial color="#0d0f13" /></mesh>
      </group>
    );
  }
  if (weapon === "grenade") {
    return (
      <group scale={scale}>
        <mesh castShadow><dodecahedronGeometry args={[0.34, 0]} /><meshStandardMaterial color="#556b35" roughness={0.7} /></mesh>
        <mesh position={[0, 0.32, 0]} castShadow><boxGeometry args={[0.28, 0.1, 0.18]} /><meshStandardMaterial color="#252525" /></mesh>
      </group>
    );
  }
  if (weapon === "shottie") {
    return (
      <group scale={scale}>
        <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[0.34, 0.25, 1.15]} /><meshStandardMaterial color="#433125" /></mesh>
        <mesh position={[-0.1, 0.12, -0.45]} castShadow><boxGeometry args={[0.12, 0.12, 0.9]} /><meshStandardMaterial color="#181b20" /></mesh>
        <mesh position={[0.1, 0.12, -0.45]} castShadow><boxGeometry args={[0.12, 0.12, 0.9]} /><meshStandardMaterial color="#181b20" /></mesh>
        <mesh position={[0, -0.2, 0.32]} castShadow><boxGeometry args={[0.18, 0.42, 0.18]} /><meshStandardMaterial color="#5a3824" /></mesh>
      </group>
    );
  }
  if (weapon === "watergun") {
    return (
      <group scale={scale}>
        <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[0.36, 0.28, 0.8]} /><meshStandardMaterial color="#1ba3ff" /></mesh>
        <mesh position={[0, 0.16, -0.14]} castShadow><boxGeometry args={[0.28, 0.22, 0.44]} /><meshStandardMaterial color="#ffdf4d" /></mesh>
        <mesh position={[0, 0.02, -0.62]} castShadow><boxGeometry args={[0.16, 0.14, 0.52]} /><meshStandardMaterial color="#00d4ff" /></mesh>
        <mesh position={[0, -0.25, 0.22]} castShadow><boxGeometry args={[0.16, 0.44, 0.2]} /><meshStandardMaterial color="#ff6b2a" /></mesh>
      </group>
    );
  }
  return (
    <group scale={scale}>
      <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[0.28, 0.26, 0.82]} /><meshStandardMaterial color="#292d35" /></mesh>
      <mesh position={[0, -0.25, 0.22]} castShadow><boxGeometry args={[0.17, 0.42, 0.18]} /><meshStandardMaterial color="#6c4228" /></mesh>
      <mesh position={[0, 0.04, -0.58]} castShadow><boxGeometry args={[0.16, 0.16, 0.48]} /><meshStandardMaterial color="#15171c" /></mesh>
      <mesh position={[0, 0.17, -0.1]} castShadow><boxGeometry args={[0.16, 0.1, 0.28]} /><meshStandardMaterial color="#d3a435" metalness={0.2} /></mesh>
    </group>
  );
}
