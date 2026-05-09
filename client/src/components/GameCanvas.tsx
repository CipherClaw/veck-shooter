import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, Sky, Stars } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { WEAPONS, type Vec3 } from "@veck/shared";
import { useGame } from "../state/store";
import { socket } from "../game/socket";
import { beep } from "../game/audio";
import { ArenaMap } from "./Maps";
import { Avatar } from "./Avatar";
import { WeaponModel } from "./WeaponModels";

const keys = new Set<string>();

export function GameCanvas() {
  const snapshot = useGame((s) => s.snapshot);
  const playerId = useGame((s) => s.playerId);
  const fx = useGame((s) => s.fx);
  const map = snapshot?.game.map ?? "Pyramid";
  return (
    <Canvas shadows camera={{ fov: 74, position: [0, 2, 8] }}>
      <color attach="background" args={["#8fd3ff"]} />
      <fog attach="fog" args={["#b7e5ff", 36, 86]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[18, 26, 14]} intensity={1.35} castShadow shadow-mapSize={[2048, 2048]} />
      <Sky sunPosition={[80, 30, 20]} turbidity={5} rayleigh={0.8} />
      <Stars radius={120} depth={40} count={1000} factor={1.4} fade speed={0.2} />
      <Suspense fallback={null}>
        <ArenaMap map={map} />
        {snapshot?.players.map((p) => <Avatar key={p.id} player={p} mine={p.id === playerId} />)}
        {fx.map((f) => <ShotFx key={f.id} fx={f} />)}
        <PlayerController />
      </Suspense>
    </Canvas>
  );
}

function PlayerController() {
  const { camera, gl } = useThree();
  const playerId = useGame((s) => s.playerId);
  const snapshot = useGame((s) => s.snapshot);
  const weapon = useGame((s) => s.weapon);
  const muted = useGame((s) => s.muted);
  const [zoom, setZoom] = useState(false);
  const velocity = useRef(new THREE.Vector3());
  const yaw = useRef(0);
  const pitch = useRef(0);
  const shotSeq = useRef(0);
  const bob = useRef(0);

  const me = snapshot?.players.find((p) => p.id === playerId);
  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.add(e.code);
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      yaw.current -= e.movementX * 0.0022;
      pitch.current = Math.max(-1.25, Math.min(1.25, pitch.current - e.movementY * 0.0022));
    };
    const click = () => gl.domElement.requestPointerLock();
    const fire = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement || e.button !== 0) return;
      shoot(camera, weapon, ++shotSeq.current);
      beep(weapon, muted);
    };
    const right = (e: MouseEvent) => {
      if (e.button === 2 && weapon === "sniper") setZoom(e.type === "mousedown");
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", move);
    gl.domElement.addEventListener("click", click);
    gl.domElement.addEventListener("mousedown", fire);
    gl.domElement.addEventListener("mousedown", right);
    gl.domElement.addEventListener("mouseup", right);
    gl.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", move);
      gl.domElement.removeEventListener("click", click);
      gl.domElement.removeEventListener("mousedown", fire);
      gl.domElement.removeEventListener("mousedown", right);
      gl.domElement.removeEventListener("mouseup", right);
    };
  }, [camera, gl.domElement, muted, weapon]);

  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = zoom ? 34 : 74;
    perspective.updateProjectionMatrix();
  }, [camera, zoom]);

  useFrame((_, dt) => {
    if (!me?.alive) return;
    const forward = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const dir = new THREE.Vector3();
    if (keys.has("KeyW")) dir.add(forward);
    if (keys.has("KeyS")) dir.sub(forward);
    if (keys.has("KeyA")) dir.sub(right);
    if (keys.has("KeyD")) dir.add(right);
    const sprint = keys.has("ShiftLeft") ? 1.55 : 1;
    if (dir.lengthSq()) dir.normalize().multiplyScalar(10 * sprint);
    velocity.current.lerp(dir, 0.2);
    const pos = new THREE.Vector3(me.position.x, me.position.y, me.position.z).addScaledVector(velocity.current, dt);
    if (keys.has("Space")) pos.y = Math.min(8, pos.y + 7 * dt);
    pos.y = Math.max(1.2, pos.y - 3.8 * dt);
    bob.current += velocity.current.length() * dt * 0.55;
    camera.position.set(pos.x, pos.y + 0.7 + Math.sin(bob.current) * 0.045, pos.z);
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    socket.emit("input", {
      position: { x: pos.x, y: pos.y, z: pos.z },
      velocity: { x: velocity.current.x, y: velocity.current.y, z: velocity.current.z },
      rotationY: yaw.current,
      weapon
    });
  });

  return <FirstPersonRig weapon={weapon} recoil={shotSeq.current} />;
}

function FirstPersonRig({ weapon, recoil }: { weapon: string; recoil: number }) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);
    group.current.translateX(0.42);
    group.current.translateY(-0.36 + Math.sin(clock.elapsedTime * 7) * 0.01);
    group.current.translateZ(-0.72 - Math.min(0.12, (Date.now() % 120) / 1000) * (recoil ? 1 : 0));
  });
  return (
    <group ref={group}>
      <mesh position={[-0.32, -0.12, 0.1]} castShadow><boxGeometry args={[0.18, 0.52, 0.2]} /><meshStandardMaterial color="#ffd1a3" /></mesh>
      <mesh position={[0.25, -0.12, 0.1]} castShadow><boxGeometry args={[0.18, 0.5, 0.2]} /><meshStandardMaterial color="#ffd1a3" /></mesh>
      <WeaponModel weapon={weapon as never} firstPerson />
    </group>
  );
}

function shoot(camera: THREE.Camera, weapon: string, seq: number) {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  socket.emit("fire", {
    origin: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    direction: { x: dir.x, y: dir.y, z: dir.z },
    weapon: weapon as never,
    seq
  });
}

function ShotFx({ fx }: { fx: { from: Vec3; to: Vec3; weapon: string; explosion?: Vec3 } }) {
  const points = useMemo(() => [new THREE.Vector3(fx.from.x, fx.from.y, fx.from.z), new THREE.Vector3(fx.to.x, fx.to.y, fx.to.z)], [fx]);
  if (fx.explosion) {
    return <mesh position={[fx.explosion.x, fx.explosion.y, fx.explosion.z]}><sphereGeometry args={[2.6, 16, 12]} /><meshStandardMaterial color="#ff8a00" emissive="#ff3d00" emissiveIntensity={1.2} transparent opacity={0.55} /></mesh>;
  }
  return (
    <Line points={points} color={fx.weapon === "watergun" ? "#2dd4ff" : "#ffd166"} lineWidth={3} />
  );
}
