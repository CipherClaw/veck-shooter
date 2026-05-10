import type { WeaponId } from "@veck/shared";

export function WeaponModel({ weapon, firstPerson = false }: { weapon: WeaponId; firstPerson?: boolean }) {
  const scale = firstPerson ? 1.12 : 0.55;
  if (weapon === "sniper") {
    return (
      <group scale={scale}>
        <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[0.22, 0.22, 1.9]} /><meshStandardMaterial color="#262b33" roughness={0.52} metalness={0.15} /></mesh>
        <mesh position={[0, 0.2, -0.1]} castShadow><boxGeometry args={[0.38, 0.22, 0.6]} /><meshStandardMaterial color="#0f1218" roughness={0.38} /></mesh>
        <mesh position={[0, -0.2, 0.5]} castShadow><boxGeometry args={[0.2, 0.48, 0.22]} /><meshStandardMaterial color="#7a4d2d" roughness={0.8} /></mesh>
        <mesh position={[0, 0.03, -1.18]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.075, 0.075, 0.82, 12]} /><meshStandardMaterial color="#0d0f13" roughness={0.35} /></mesh>
        <mesh position={[0, 0.36, -0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.18, 0.18, 0.42, 16]} /><meshStandardMaterial color="#111827" roughness={0.45} metalness={0.2} /></mesh>
        <mesh position={[0, 0.36, -0.02]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 0.44, 16]} /><meshStandardMaterial color="#4cc9ff" emissive="#075985" emissiveIntensity={0.2} /></mesh>
      </group>
    );
  }
  if (weapon === "grenade") {
    return (
      <group scale={scale}>
        <mesh castShadow><dodecahedronGeometry args={[0.28, 0]} /><meshStandardMaterial color="#3f5f2f" roughness={0.78} /></mesh>
        <mesh position={[0, 0.25, 0]} castShadow><boxGeometry args={[0.22, 0.08, 0.14]} /><meshStandardMaterial color="#1f2937" roughness={0.52} /></mesh>
        <mesh position={[0.11, 0.34, 0]} rotation={[0, 0, 0.45]} castShadow><boxGeometry args={[0.18, 0.035, 0.035]} /><meshStandardMaterial color="#a3a3a3" metalness={0.25} roughness={0.4} /></mesh>
      </group>
    );
  }
  if (weapon === "shottie") {
    return (
      <group scale={scale}>
        <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[0.36, 0.27, 1.18]} /><meshStandardMaterial color="#433125" roughness={0.82} /></mesh>
        <mesh position={[-0.1, 0.13, -0.47]} castShadow><boxGeometry args={[0.12, 0.12, 0.92]} /><meshStandardMaterial color="#151922" roughness={0.4} metalness={0.2} /></mesh>
        <mesh position={[0.1, 0.13, -0.47]} castShadow><boxGeometry args={[0.12, 0.12, 0.92]} /><meshStandardMaterial color="#151922" roughness={0.4} metalness={0.2} /></mesh>
        <mesh position={[0, -0.22, 0.34]} castShadow><boxGeometry args={[0.2, 0.46, 0.2]} /><meshStandardMaterial color="#5a3824" roughness={0.78} /></mesh>
        <mesh position={[0, 0.2, 0.3]} castShadow><boxGeometry args={[0.22, 0.08, 0.36]} /><meshStandardMaterial color="#d4a94f" metalness={0.2} roughness={0.35} /></mesh>
      </group>
    );
  }
  if (weapon === "watergun") {
    return (
      <group scale={scale}>
        <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[0.38, 0.3, 0.82]} /><meshStandardMaterial color="#1ba3ff" roughness={0.45} /></mesh>
        <mesh position={[0, 0.17, -0.14]} castShadow><boxGeometry args={[0.3, 0.24, 0.46]} /><meshStandardMaterial color="#ffdf4d" roughness={0.4} /></mesh>
        <mesh position={[0, 0.03, -0.64]} castShadow><boxGeometry args={[0.16, 0.14, 0.54]} /><meshStandardMaterial color="#00d4ff" emissive="#0284c7" emissiveIntensity={0.18} /></mesh>
        <mesh position={[0, -0.26, 0.24]} castShadow><boxGeometry args={[0.17, 0.46, 0.2]} /><meshStandardMaterial color="#ff6b2a" roughness={0.55} /></mesh>
        <mesh position={[0, -0.08, -0.08]} castShadow><boxGeometry args={[0.44, 0.08, 0.18]} /><meshStandardMaterial color="#0f766e" roughness={0.5} /></mesh>
      </group>
    );
  }
  return (
    <group scale={scale}>
      <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[0.3, 0.28, 0.84]} /><meshStandardMaterial color="#292d35" roughness={0.48} metalness={0.12} /></mesh>
      <mesh position={[0, -0.26, 0.24]} castShadow><boxGeometry args={[0.18, 0.44, 0.18]} /><meshStandardMaterial color="#6c4228" roughness={0.78} /></mesh>
      <mesh position={[0, 0.04, -0.6]} castShadow><boxGeometry args={[0.16, 0.16, 0.5]} /><meshStandardMaterial color="#15171c" roughness={0.35} metalness={0.18} /></mesh>
      <mesh position={[0, 0.18, -0.1]} castShadow><boxGeometry args={[0.18, 0.1, 0.3]} /><meshStandardMaterial color="#d3a435" metalness={0.25} roughness={0.34} /></mesh>
      <mesh position={[0, -0.08, -0.18]} castShadow><boxGeometry args={[0.34, 0.08, 0.16]} /><meshStandardMaterial color="#111827" roughness={0.4} /></mesh>
    </group>
  );
}
