import type { WeaponId } from "@veck/shared";

export function WeaponModel({ weapon, firstPerson = false }: { weapon: WeaponId; firstPerson?: boolean }) {
  const scale = firstPerson ? 1.12 : 0.55;
  if (weapon === "sniper") {
    return (
      <group scale={scale}>
        <mesh position={[0, 0, 0.08]} castShadow><boxGeometry args={[0.24, 0.18, 1.02]} /><meshStandardMaterial color="#252b34" roughness={0.5} metalness={0.16} /></mesh>
        <mesh position={[0, 0.08, 0.03]} castShadow><boxGeometry args={[0.32, 0.1, 0.62]} /><meshStandardMaterial color="#111827" roughness={0.42} metalness={0.2} /></mesh>
        <mesh position={[0, -0.03, 0.58]} castShadow><boxGeometry args={[0.28, 0.16, 0.56]} /><meshStandardMaterial color="#7a4d2d" roughness={0.8} /></mesh>
        <mesh position={[0, -0.22, 0.5]} rotation={[-0.26, 0, 0]} castShadow><boxGeometry args={[0.2, 0.42, 0.2]} /><meshStandardMaterial color="#654026" roughness={0.82} /></mesh>
        <mesh position={[0, 0.02, -0.77]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.065, 0.085, 1.12, 12]} /><meshStandardMaterial color="#10141c" roughness={0.36} metalness={0.22} /></mesh>
        <mesh position={[0, 0.02, -1.36]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.095, 0.075, 0.18, 12]} /><meshStandardMaterial color="#080a0e" roughness={0.34} metalness={0.24} /></mesh>
        <mesh position={[0, 0.18, -0.05]} castShadow><boxGeometry args={[0.08, 0.08, 0.66]} /><meshStandardMaterial color="#0b0f16" roughness={0.4} /></mesh>
        <mesh position={[0, 0.36, -0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.18, 0.18, 0.52, 16]} /><meshStandardMaterial color="#111827" roughness={0.45} metalness={0.2} /></mesh>
        <mesh position={[0, 0.36, -0.02]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 0.54, 16]} /><meshStandardMaterial color="#4cc9ff" emissive="#075985" emissiveIntensity={0.2} /></mesh>
        <mesh position={[0, 0.2, -0.68]} castShadow><boxGeometry args={[0.06, 0.08, 0.08]} /><meshStandardMaterial color="#d1d5db" roughness={0.35} metalness={0.25} /></mesh>
        <mesh position={[0, 0.16, 0.42]} castShadow><boxGeometry args={[0.07, 0.07, 0.08]} /><meshStandardMaterial color="#d1d5db" roughness={0.35} metalness={0.25} /></mesh>
      </group>
    );
  }
  if (weapon === "grenade") {
    return (
      <group scale={scale}>
        <mesh castShadow><dodecahedronGeometry args={[0.28, 1]} /><meshStandardMaterial color="#3f5f2f" roughness={0.8} /></mesh>
        <mesh position={[-0.12, 0, 0]} castShadow><boxGeometry args={[0.035, 0.42, 0.42]} /><meshStandardMaterial color="#314924" roughness={0.82} /></mesh>
        <mesh position={[0.12, 0, 0]} castShadow><boxGeometry args={[0.035, 0.42, 0.42]} /><meshStandardMaterial color="#314924" roughness={0.82} /></mesh>
        <mesh position={[0, 0, -0.12]} castShadow><boxGeometry args={[0.42, 0.42, 0.035]} /><meshStandardMaterial color="#314924" roughness={0.82} /></mesh>
        <mesh position={[0, 0, 0.12]} castShadow><boxGeometry args={[0.42, 0.42, 0.035]} /><meshStandardMaterial color="#314924" roughness={0.82} /></mesh>
        <mesh position={[0, 0.27, 0]} castShadow><cylinderGeometry args={[0.12, 0.15, 0.14, 12]} /><meshStandardMaterial color="#1f2937" roughness={0.52} metalness={0.15} /></mesh>
        <mesh position={[0.1, 0.39, 0]} rotation={[0.1, 0, 0.7]} castShadow><torusGeometry args={[0.13, 0.018, 6, 14, Math.PI * 1.45]} /><meshStandardMaterial color="#b8b8b8" metalness={0.35} roughness={0.38} /></mesh>
        <mesh position={[-0.09, 0.36, 0]} rotation={[0, 0, -0.4]} castShadow><boxGeometry args={[0.16, 0.04, 0.08]} /><meshStandardMaterial color="#a3a3a3" metalness={0.25} roughness={0.4} /></mesh>
      </group>
    );
  }
  if (weapon === "shottie") {
    return (
      <group scale={scale}>
        <mesh position={[0, 0, 0.12]} castShadow><boxGeometry args={[0.34, 0.2, 0.82]} /><meshStandardMaterial color="#433125" roughness={0.82} /></mesh>
        <mesh position={[0, -0.06, 0.62]} rotation={[-0.1, 0, 0]} castShadow><boxGeometry args={[0.42, 0.22, 0.56]} /><meshStandardMaterial color="#5a3824" roughness={0.8} /></mesh>
        <mesh position={[-0.095, 0.12, -0.5]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.06, 0.065, 1.0, 12]} /><meshStandardMaterial color="#151922" roughness={0.4} metalness={0.2} /></mesh>
        <mesh position={[0.095, 0.12, -0.5]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.06, 0.065, 1.0, 12]} /><meshStandardMaterial color="#151922" roughness={0.4} metalness={0.2} /></mesh>
        <mesh position={[-0.095, 0.12, -1.03]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.075, 0.065, 0.1, 12]} /><meshStandardMaterial color="#0c0f14" roughness={0.34} metalness={0.24} /></mesh>
        <mesh position={[0.095, 0.12, -1.03]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.075, 0.065, 0.1, 12]} /><meshStandardMaterial color="#0c0f14" roughness={0.34} metalness={0.24} /></mesh>
        <mesh position={[0, -0.19, 0.28]} rotation={[-0.22, 0, 0]} castShadow><boxGeometry args={[0.2, 0.44, 0.2]} /><meshStandardMaterial color="#5a3824" roughness={0.78} /></mesh>
        <mesh position={[0, 0.2, 0.25]} castShadow><boxGeometry args={[0.24, 0.07, 0.36]} /><meshStandardMaterial color="#d4a94f" metalness={0.2} roughness={0.35} /></mesh>
        <mesh position={[0, -0.08, -0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.13, 0.018, 6, 14, Math.PI]} /><meshStandardMaterial color="#111827" roughness={0.4} metalness={0.15} /></mesh>
        <mesh position={[0, 0.22, -0.62]} castShadow><boxGeometry args={[0.07, 0.06, 0.08]} /><meshStandardMaterial color="#d1d5db" roughness={0.35} metalness={0.25} /></mesh>
      </group>
    );
  }
  if (weapon === "watergun") {
    return (
      <group scale={scale}>
        <mesh position={[0, -0.01, 0.07]} castShadow><boxGeometry args={[0.36, 0.22, 0.66]} /><meshStandardMaterial color="#1ba3ff" roughness={0.45} /></mesh>
        <mesh position={[0, 0.16, -0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.18, 0.2, 0.48, 14]} /><meshStandardMaterial color="#ffdf4d" roughness={0.42} /></mesh>
        <mesh position={[0, 0.07, -0.57]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.075, 0.095, 0.62, 12]} /><meshStandardMaterial color="#00d4ff" emissive="#0284c7" emissiveIntensity={0.18} roughness={0.38} /></mesh>
        <mesh position={[0, 0.07, -0.93]} rotation={[Math.PI / 2, 0, 0]} castShadow><coneGeometry args={[0.11, 0.2, 12]} /><meshStandardMaterial color="#ff8c2a" roughness={0.45} /></mesh>
        <mesh position={[0, -0.26, 0.22]} rotation={[-0.18, 0, 0]} castShadow><boxGeometry args={[0.17, 0.44, 0.2]} /><meshStandardMaterial color="#ff6b2a" roughness={0.55} /></mesh>
        <mesh position={[0, -0.08, -0.08]} castShadow><boxGeometry args={[0.44, 0.07, 0.18]} /><meshStandardMaterial color="#0f766e" roughness={0.5} /></mesh>
        <mesh position={[0, -0.08, -0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.12, 0.016, 6, 14, Math.PI]} /><meshStandardMaterial color="#0f766e" roughness={0.5} /></mesh>
        <mesh position={[0.17, 0.17, 0.08]} rotation={[0, 0, 0.2]} castShadow><boxGeometry args={[0.06, 0.13, 0.32]} /><meshStandardMaterial color="#0ea5e9" roughness={0.45} /></mesh>
        <mesh position={[0, 0.26, 0.16]} castShadow><boxGeometry args={[0.22, 0.05, 0.28]} /><meshStandardMaterial color="#ffdf4d" roughness={0.4} /></mesh>
      </group>
    );
  }
  if (weapon === "fist") {
    return (
      <group scale={scale}>
        <mesh position={[0, 0.01, 0.34]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.08, 0.13, 0.56, 12]} /><meshStandardMaterial color="#2563eb" roughness={0.62} /></mesh>
        <mesh position={[0, 0.01, 0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.115, 0.022, 6, 12]} /><meshStandardMaterial color="#2563eb" roughness={0.58} /></mesh>
        <mesh position={[0, 0.01, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.065, 0.082, 0.16, 10]} /><meshStandardMaterial color="#ffd1a3" roughness={0.72} /></mesh>
        <mesh position={[0, 0, -0.15]} scale={[1.24, 0.86, 0.98]} castShadow><sphereGeometry args={[0.16, 12, 8]} /><meshStandardMaterial color="#ffd1a3" roughness={0.72} /></mesh>
        <mesh position={[-0.135, 0.05, -0.275]} scale={[1, 0.75, 0.72]} castShadow><sphereGeometry args={[0.053, 10, 6]} /><meshStandardMaterial color="#ffc28f" roughness={0.76} /></mesh>
        <mesh position={[-0.045, 0.067, -0.302]} scale={[1, 0.75, 0.72]} castShadow><sphereGeometry args={[0.061, 10, 6]} /><meshStandardMaterial color="#ffc28f" roughness={0.76} /></mesh>
        <mesh position={[0.045, 0.063, -0.302]} scale={[1, 0.75, 0.72]} castShadow><sphereGeometry args={[0.059, 10, 6]} /><meshStandardMaterial color="#ffc28f" roughness={0.76} /></mesh>
        <mesh position={[0.135, 0.045, -0.275]} scale={[1, 0.75, 0.72]} castShadow><sphereGeometry args={[0.05, 10, 6]} /><meshStandardMaterial color="#ffc28f" roughness={0.76} /></mesh>
        <mesh position={[-0.112, -0.062, -0.268]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.036, 0.044, 0.13, 8]} /><meshStandardMaterial color="#ffc28f" roughness={0.76} /></mesh>
        <mesh position={[-0.035, -0.08, -0.294]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.041, 0.048, 0.15, 8]} /><meshStandardMaterial color="#ffc28f" roughness={0.76} /></mesh>
        <mesh position={[0.048, -0.076, -0.288]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.039, 0.047, 0.14, 8]} /><meshStandardMaterial color="#ffc28f" roughness={0.76} /></mesh>
        <mesh position={[0.166, -0.022, -0.112]} rotation={[0.58, 0.1, -0.78]} castShadow><cylinderGeometry args={[0.036, 0.052, 0.22, 8]} /><meshStandardMaterial color="#ffc28f" roughness={0.76} /></mesh>
      </group>
    );
  }
  return (
    <group scale={scale}>
      <mesh position={[0, 0.02, 0.06]} castShadow><boxGeometry args={[0.3, 0.2, 0.64]} /><meshStandardMaterial color="#292d35" roughness={0.48} metalness={0.12} /></mesh>
      <mesh position={[0, 0.02, -0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.17, 0.17, 0.2, 14]} /><meshStandardMaterial color="#1d2129" roughness={0.42} metalness={0.18} /></mesh>
      <mesh position={[0, 0.04, -0.62]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.075, 0.09, 0.58, 12]} /><meshStandardMaterial color="#15171c" roughness={0.35} metalness={0.18} /></mesh>
      <mesh position={[0, 0.04, -0.94]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.095, 0.08, 0.12, 12]} /><meshStandardMaterial color="#0d0f13" roughness={0.34} metalness={0.22} /></mesh>
      <mesh position={[0, -0.24, 0.24]} rotation={[-0.22, 0, 0]} castShadow><boxGeometry args={[0.18, 0.42, 0.18]} /><meshStandardMaterial color="#6c4228" roughness={0.78} /></mesh>
      <mesh position={[0, 0.17, -0.1]} castShadow><boxGeometry args={[0.17, 0.08, 0.28]} /><meshStandardMaterial color="#d3a435" metalness={0.25} roughness={0.34} /></mesh>
      <mesh position={[0, -0.08, -0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.13, 0.018, 6, 14, Math.PI]} /><meshStandardMaterial color="#111827" roughness={0.4} /></mesh>
      <mesh position={[0, 0.18, -0.5]} castShadow><boxGeometry args={[0.05, 0.07, 0.08]} /><meshStandardMaterial color="#d1d5db" roughness={0.35} metalness={0.25} /></mesh>
      <mesh position={[0, 0.17, 0.2]} castShadow><boxGeometry args={[0.06, 0.06, 0.08]} /><meshStandardMaterial color="#d1d5db" roughness={0.35} metalness={0.25} /></mesh>
    </group>
  );
}
