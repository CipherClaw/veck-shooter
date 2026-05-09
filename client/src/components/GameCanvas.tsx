import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, Sky, Stars } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
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
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#bfe8ff", "#8f7d62", 0.45]} />
      <directionalLight
        position={[18, 28, 14]}
        intensity={1.75}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={42}
        shadow-camera-bottom={-42}
      />
      <Sky sunPosition={[80, 34, 20]} turbidity={4.2} rayleigh={0.65} mieCoefficient={0.004} />
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
  const localPosition = useRef(new THREE.Vector3());
  const localReady = useRef(false);
  const verticalVelocity = useRef(0);
  const yaw = useRef(0);
  const pitch = useRef(0);
  const shotSeq = useRef(0);
  const recoil = useRef(0);
  const bob = useRef(0);
  const [locked, setLocked] = useState(false);
  const [lockCooldown, setLockCooldown] = useState(0);

  const me = snapshot?.players.find((p) => p.id === playerId);
  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.add(e.code);
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      yaw.current -= e.movementX * 0.0022;
      pitch.current = Math.max(-1.25, Math.min(1.25, pitch.current - e.movementY * 0.0022));
    };
    const requestLock = () => {
      if (!me?.alive || document.pointerLockElement === gl.domElement || performance.now() < lockCooldown) return;
      gl.domElement.requestPointerLock().catch(() => undefined);
    };
    const fire = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement || e.button !== 0) return;
      recoil.current = Math.min(1, recoil.current + 0.85);
      shoot(camera, weapon, ++shotSeq.current);
      beep(weapon, muted);
    };
    const right = (e: MouseEvent) => {
      if (e.button === 2 && weapon === "sniper") setZoom(e.type === "mousedown");
    };
    const pointerLockChange = () => {
      const isLocked = document.pointerLockElement === gl.domElement;
      setLocked(isLocked);
      if (!isLocked) setLockCooldown(performance.now() + 450);
    };
    const context = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", move);
    document.addEventListener("pointerlockchange", pointerLockChange);
    gl.domElement.addEventListener("click", requestLock);
    gl.domElement.addEventListener("mousedown", fire);
    gl.domElement.addEventListener("mousedown", right);
    gl.domElement.addEventListener("mouseup", right);
    gl.domElement.addEventListener("contextmenu", context);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", move);
      document.removeEventListener("pointerlockchange", pointerLockChange);
      gl.domElement.removeEventListener("click", requestLock);
      gl.domElement.removeEventListener("mousedown", fire);
      gl.domElement.removeEventListener("mousedown", right);
      gl.domElement.removeEventListener("mouseup", right);
      gl.domElement.removeEventListener("contextmenu", context);
    };
  }, [camera, gl.domElement, lockCooldown, me?.alive, muted, weapon]);

  useEffect(() => {
    if (!me?.alive) {
      localReady.current = false;
      return;
    }
    const serverPos = new THREE.Vector3(me.position.x, me.position.y, me.position.z);
    if (!localReady.current || localPosition.current.distanceToSquared(serverPos) > 49) {
      localPosition.current.copy(serverPos);
      verticalVelocity.current = 0;
      localReady.current = true;
    }
  }, [me?.alive, me?.position.x, me?.position.y, me?.position.z]);

  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = zoom ? 34 : 74;
    perspective.updateProjectionMatrix();
  }, [camera, zoom]);

  useFrame((_, dt) => {
    if (!me?.alive) return;
    const step = Math.min(dt, 0.05);
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const dir = new THREE.Vector3();
    if (keys.has("KeyW")) dir.add(forward);
    if (keys.has("KeyS")) dir.sub(forward);
    if (keys.has("KeyA")) dir.sub(right);
    if (keys.has("KeyD")) dir.add(right);
    const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 1.7 : 1;
    if (dir.lengthSq()) dir.normalize().multiplyScalar(15 * sprint);
    const accel = 1 - Math.exp(-18 * step);
    velocity.current.lerp(dir, accel);
    const pos = localPosition.current.addScaledVector(velocity.current, step);
    if (keys.has("Space") && pos.y <= 1.22) verticalVelocity.current = 7.8;
    verticalVelocity.current -= 19 * step;
    pos.y = Math.max(1.2, Math.min(8, pos.y + verticalVelocity.current * step));
    if (pos.y <= 1.2) verticalVelocity.current = 0;
    pos.x = Math.max(-34, Math.min(34, pos.x));
    pos.z = Math.max(-34, Math.min(34, pos.z));
    const moving = velocity.current.length();
    bob.current += moving * step * 0.7;
    recoil.current = THREE.MathUtils.damp(recoil.current, 0, 14, step);
    camera.position.set(pos.x, pos.y + 0.7, pos.z);
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    socket.emit("input", {
      position: { x: pos.x, y: pos.y, z: pos.z },
      velocity: { x: velocity.current.x, y: velocity.current.y, z: velocity.current.z },
      rotationY: yaw.current,
      weapon
    });
  });

  return (
    <>
      <FirstPersonRig weapon={weapon} velocity={velocity} bob={bob} recoil={recoil} playerColor={me?.team === "green" ? "#22c55e" : me?.team === "red" ? "#ef4444" : "#3b82f6"} />
      {me?.alive && !locked && (
        <Html fullscreen>
          <button className="play-overlay" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => {
            e.stopPropagation();
            if (performance.now() < lockCooldown) return;
            gl.domElement.requestPointerLock().catch(() => undefined);
          }}>
            <strong>Click to play</strong>
            <span>WASD move · Mouse look · Click fire</span>
          </button>
        </Html>
      )}
    </>
  );
}

function FirstPersonRig({ weapon, velocity, bob, recoil, playerColor }: { weapon: string; velocity: MutableRefObject<THREE.Vector3>; bob: MutableRefObject<number>; recoil: MutableRefObject<number>; playerColor: string }) {
  const { camera, scene } = useThree();
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    if (!group.current) return;
    const rig = group.current;
    if (!camera.parent) scene.add(camera);
    camera.add(rig);
    return () => {
      camera.remove(rig);
    };
  }, [camera, scene]);
  useFrame((_, dt) => {
    if (!group.current) return;
    const moveAmount = Math.min(1, velocity.current.length() / 10);
    const target = new THREE.Vector3(
      0.42 + Math.sin(bob.current * 0.5) * 0.012 * moveAmount,
      -0.38 + Math.sin(bob.current) * 0.025 * moveAmount + recoil.current * 0.018,
      -0.74 + Math.cos(bob.current * 1.05) * 0.018 * moveAmount + recoil.current * 0.13
    );
    group.current.position.lerp(target, 1 - Math.exp(-22 * dt));
    group.current.rotation.set(-0.035 - recoil.current * 0.08, 0.035, -0.015);
  });
  return (
    <group ref={group}>
      <mesh position={[-0.38, -0.2, 0.08]} rotation={[0.18, 0.05, -0.08]} castShadow><boxGeometry args={[0.2, 0.58, 0.2]} /><meshStandardMaterial color={playerColor} roughness={0.62} /></mesh>
      <mesh position={[-0.36, -0.53, -0.03]} rotation={[0.14, 0.04, -0.08]} castShadow><boxGeometry args={[0.18, 0.2, 0.18]} /><meshStandardMaterial color="#ffd1a3" roughness={0.72} /></mesh>
      <mesh position={[0.24, -0.18, 0.08]} rotation={[0.1, -0.04, 0.08]} castShadow><boxGeometry args={[0.2, 0.56, 0.2]} /><meshStandardMaterial color={playerColor} roughness={0.62} /></mesh>
      <mesh position={[0.24, -0.5, -0.03]} rotation={[0.1, -0.04, 0.08]} castShadow><boxGeometry args={[0.18, 0.2, 0.18]} /><meshStandardMaterial color="#ffd1a3" roughness={0.72} /></mesh>
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
