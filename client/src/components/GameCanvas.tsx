import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, Sky, Stars } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { ARENAS, LADDER_CLIMB_SPEED, WEAPONS, ladderAt, resolvePlayerPosition, type Vec3 } from "@veck/shared";
import { useGame } from "../state/store";
import { socket } from "../game/socket";
import { ArenaMap } from "./Maps";
import { Avatar } from "./Avatar";
import { WeaponModel } from "./WeaponModels";
import type { PlayerSnapshot, WeaponId } from "@veck/shared";

const keys = new Set<string>();

export function GameCanvas() {
  const snapshot = useGame((s) => s.snapshot);
  const playerId = useGame((s) => s.playerId);
  const fx = useGame((s) => s.fx);
  const map = snapshot?.game.map ?? "Pyramid";
  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 74, position: [0, 2, 8] }}>
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
        {snapshot?.grenades.map((grenade) => <GrenadeProjectile key={grenade.id} position={grenade.position} />)}
        {snapshot?.explosions.map((explosion) => <ExplosionFx key={explosion.id} explosion={explosion} />)}
        {fx.map((f) => <ShotFx key={f.id} fx={f} />)}
        <RendererEvents />
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
  const setScoped = useGame((s) => s.setScoped);
  const [zoom, setZoom] = useState(false);
  const [spraying, setSpraying] = useState(false);
  const velocity = useRef(new THREE.Vector3());
  const localPosition = useRef(new THREE.Vector3());
  const localReady = useRef(false);
  const verticalVelocity = useRef(0);
  const yaw = useRef(0);
  const pitch = useRef(0);
  const shotSeq = useRef(0);
  const firing = useRef(false);
  const lastLocalFire = useRef<Record<WeaponId, number>>({ revolver: 0, sniper: 0, grenade: 0, shottie: 0, watergun: 0 });
  const optimisticAmmo = useRef<Record<WeaponId, number>>({ revolver: 6, sniper: 4, grenade: 2, shottie: 3, watergun: 100 });
  const latestPlayer = useRef<PlayerSnapshot>();
  const recoil = useRef(0);
  const bob = useRef(0);
  const [locked, setLocked] = useState(false);
  const [lockCooldown, setLockCooldown] = useState(0);

  const me = snapshot?.players.find((p) => p.id === playerId);
  const map = snapshot?.game.map ?? "Pyramid";
  const matchActive = snapshot?.game.status === "active";
  const scoped = Boolean(matchActive && zoom && weapon === "sniper");
  const controlsBlocked = () => !matchActive || isTextInputActive();

  useEffect(() => {
    latestPlayer.current = me;
    if (me) optimisticAmmo.current = { ...me.ammo };
  }, [me?.alive, me?.ammo.grenade, me?.ammo.revolver, me?.ammo.shottie, me?.ammo.sniper, me?.ammo.watergun, me?.reloadingUntil, me?.reloadingWeapon]);

  useEffect(() => {
    setScoped(scoped);
    return () => setScoped(false);
  }, [scoped, setScoped]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (controlsBlocked()) return;
      keys.add(e.code);
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement || controlsBlocked()) return;
      yaw.current -= e.movementX * 0.0022;
      pitch.current = Math.max(-1.25, Math.min(1.25, pitch.current - e.movementY * 0.0022));
    };
    const requestLock = () => {
      if (!me?.alive || !matchActive || controlsBlocked() || document.pointerLockElement === gl.domElement || performance.now() < lockCooldown) return;
      gl.domElement.requestPointerLock().catch(() => undefined);
    };
    const fire = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement || e.button !== 0 || controlsBlocked()) return;
      if (!canLocalFire(latestPlayer.current, weapon, optimisticAmmo.current)) {
        firing.current = false;
        setSpraying(false);
        return;
      }
      if (weapon === "watergun") {
        firing.current = true;
        return;
      }
      const now = performance.now();
      if (now - lastLocalFire.current[weapon] < WEAPONS[weapon].fireMs) return;
      lastLocalFire.current[weapon] = now;
      firing.current = false;
      spendLocalAmmo(optimisticAmmo.current, weapon);
      recoil.current = Math.min(1, recoil.current + 0.85);
      shoot(camera, weapon, ++shotSeq.current);
    };
    const stopFire = (e: MouseEvent) => {
      if (e.button !== 0) return;
      firing.current = false;
      setSpraying(false);
    };
    const right = (e: MouseEvent) => {
      if (e.button === 2 && weapon === "sniper") setZoom(e.type === "mousedown" && !controlsBlocked());
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
    window.addEventListener("mouseup", stopFire);
    gl.domElement.addEventListener("mousedown", right);
    window.addEventListener("mouseup", right);
    gl.domElement.addEventListener("contextmenu", context);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", move);
      document.removeEventListener("pointerlockchange", pointerLockChange);
      gl.domElement.removeEventListener("click", requestLock);
      gl.domElement.removeEventListener("mousedown", fire);
      window.removeEventListener("mouseup", stopFire);
      gl.domElement.removeEventListener("mousedown", right);
      window.removeEventListener("mouseup", right);
      gl.domElement.removeEventListener("contextmenu", context);
    };
  }, [camera, gl.domElement, lockCooldown, matchActive, weapon]);

  useEffect(() => {
    if (!me?.alive || !matchActive) {
      localReady.current = false;
      firing.current = false;
      setSpraying(false);
      setZoom(false);
      const perspective = camera as THREE.PerspectiveCamera;
      perspective.fov = 74;
      perspective.updateProjectionMatrix();
      keys.clear();
      if (document.pointerLockElement === gl.domElement) document.exitPointerLock();
      return;
    }
    const serverPos = new THREE.Vector3(me.position.x, me.position.y, me.position.z);
    if (!localReady.current || localPosition.current.distanceToSquared(serverPos) > 49) {
      localPosition.current.copy(serverPos);
      verticalVelocity.current = 0;
      localReady.current = true;
    }
  }, [camera, gl.domElement, matchActive, me?.alive, me?.position.x, me?.position.y, me?.position.z]);

  useEffect(() => {
    if (weapon !== "sniper") setZoom(false);
    if (weapon !== "watergun" || (me?.ammo.watergun ?? 1) <= 0) {
      firing.current = false;
      setSpraying(false);
    }
  }, [me?.ammo.watergun, weapon]);

  useFrame((_, dt) => {
    if (!me?.alive || !matchActive) return;
    if (controlsBlocked()) {
      firing.current = false;
      setSpraying(false);
    }
    const step = Math.min(dt, 0.05);
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = THREE.MathUtils.damp(perspective.fov, scoped ? 21 : 74, scoped ? 10 : 8, step);
    perspective.updateProjectionMatrix();
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const dir = new THREE.Vector3();
    if (!controlsBlocked() && keys.has("KeyW")) dir.add(forward);
    if (!controlsBlocked() && keys.has("KeyS")) dir.sub(forward);
    if (!controlsBlocked() && keys.has("KeyA")) dir.sub(right);
    if (!controlsBlocked() && keys.has("KeyD")) dir.add(right);
    const sprint = !controlsBlocked() && (keys.has("ShiftLeft") || keys.has("ShiftRight")) ? 1.7 : 1;
    if (dir.lengthSq()) dir.normalize().multiplyScalar(15 * sprint);
    const accel = 1 - Math.exp(-18 * step);
    velocity.current.lerp(dir, accel);
    const previous = localPosition.current.clone();
    const pos = localPosition.current.addScaledVector(velocity.current, step);
    const ladder = ladderAt(map, { x: pos.x, y: pos.y, z: pos.z });
    const climbInput = !controlsBlocked() && ladder ? Number(keys.has("KeyW") || keys.has("Space")) - Number(keys.has("KeyS")) : 0;
    if (ladder) {
      verticalVelocity.current = climbInput * LADDER_CLIMB_SPEED;
      pos.y = Math.max(ladder.bottomY, Math.min(ladder.topY, pos.y + verticalVelocity.current * step));
      if (climbInput > 0 && pos.y >= ladder.topY - 0.04) {
        pos.set(ladder.exit.x, ladder.exit.y, ladder.exit.z);
      }
    } else {
      if (!controlsBlocked() && keys.has("Space") && pos.y <= 1.22) verticalVelocity.current = 7.8;
      verticalVelocity.current -= 19 * step;
      pos.y = Math.max(1.2, Math.min(12, pos.y + verticalVelocity.current * step));
    }
    const resolved = resolvePlayerPosition(map, { x: pos.x, y: pos.y, z: pos.z }, { x: previous.x, y: previous.y, z: previous.z });
    if (ladder || resolved.y > pos.y || resolved.y <= 1.21) verticalVelocity.current = 0;
    pos.set(resolved.x, resolved.y, resolved.z);
    const arena = ARENAS[map];
    pos.y = Math.min(pos.y, 12);
    pos.x = Math.max(-arena.bounds, Math.min(arena.bounds, pos.x));
    pos.z = Math.max(-arena.bounds, Math.min(arena.bounds, pos.z));
    const moving = velocity.current.length();
    bob.current += moving * step * 0.7;
    recoil.current = THREE.MathUtils.damp(recoil.current, 0, 14, step);
    if (weapon === "watergun" && firing.current) {
      if (!canLocalFire(me, weapon, optimisticAmmo.current)) {
        firing.current = false;
        setSpraying(false);
      } else if (performance.now() - lastLocalFire.current.watergun >= WEAPONS.watergun.fireMs) {
        lastLocalFire.current.watergun = performance.now();
        spendLocalAmmo(optimisticAmmo.current, weapon);
        setSpraying(true);
        recoil.current = Math.min(0.65, recoil.current + 0.14);
        shoot(camera, weapon, ++shotSeq.current);
      }
    }
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
      <FirstPersonRig weapon={weapon} velocity={velocity} bob={bob} recoil={recoil} scoped={scoped} spraying={spraying && weapon === "watergun"} playerColor={me?.team === "green" ? "#22c55e" : me?.team === "red" ? "#ef4444" : "#3b82f6"} />
      {me?.alive && matchActive && !locked && (
        <Html fullscreen>
          <button className="play-overlay" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => {
            e.stopPropagation();
            if (performance.now() < lockCooldown) return;
            gl.domElement.requestPointerLock().catch(() => undefined);
          }}>
            <strong>Click to play</strong>
            <span>WASD move · Mouse look · Click fire · Enter chat</span>
          </button>
        </Html>
      )}
    </>
  );
}

function FirstPersonRig({ weapon, velocity, bob, recoil, scoped, spraying, playerColor }: { weapon: string; velocity: MutableRefObject<THREE.Vector3>; bob: MutableRefObject<number>; recoil: MutableRefObject<number>; scoped: boolean; spraying: boolean; playerColor: string }) {
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
    group.current.visible = !scoped;
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
      {spraying && <LocalWaterSpray />}
    </group>
  );
}

function LocalWaterSpray() {
  const drops = useMemo(() => Array.from({ length: 13 }, (_, i) => new THREE.Vector3((Math.sin(i * 7.1) * 0.04), (Math.cos(i * 3.9) * 0.035), -0.55 - i * 0.25)), []);
  return (
    <group position={[0, 0.04, -0.55]}>
      {drops.map((point, i) => (
        <mesh key={i} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.035 + (i % 3) * 0.01, 8, 6]} />
          <meshStandardMaterial color="#38d9ff" emissive="#0284c7" emissiveIntensity={0.7} transparent opacity={0.75} />
        </mesh>
      ))}
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

function weaponAmmoCost(weapon: WeaponId) {
  return weapon === "watergun" ? 2 : 1;
}

function canLocalFire(player: PlayerSnapshot | undefined, weapon: WeaponId, optimisticAmmo: Record<WeaponId, number>) {
  if (!player?.alive) return false;
  const reloading = player.reloadingWeapon === weapon && player.reloadingUntil && Date.now() < player.reloadingUntil;
  if (reloading) return false;
  return Math.min(player.ammo[weapon] ?? 0, optimisticAmmo[weapon] ?? 0) >= weaponAmmoCost(weapon);
}

function spendLocalAmmo(ammo: Record<WeaponId, number>, weapon: WeaponId) {
  ammo[weapon] = Math.max(0, (ammo[weapon] ?? 0) - weaponAmmoCost(weapon));
}

function ShotFx({ fx }: { fx: { from: Vec3; to: Vec3; weapon: string; explosion?: Vec3 } }) {
  const group = useRef<THREE.Group>(null);
  const createdAt = useRef(performance.now());
  const from = useMemo(() => new THREE.Vector3(fx.from.x, fx.from.y, fx.from.z), [fx.from.x, fx.from.y, fx.from.z]);
  const to = useMemo(() => new THREE.Vector3(fx.to.x, fx.to.y, fx.to.z), [fx.to.x, fx.to.y, fx.to.z]);
  const shot = useMemo(() => {
    const direction = to.clone().sub(from);
    const distance = Math.max(0.01, direction.length());
    direction.normalize();
    const right = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0));
    if (right.lengthSq() < 0.001) right.set(1, 0, 0);
    right.normalize();
    const up = new THREE.Vector3().crossVectors(right, direction).normalize();
    const pelletCount = fx.weapon === "shottie" ? 7 : 1;
    const color = fx.weapon === "sniper" ? "#93e8ff" : fx.weapon === "watergun" ? "#2dd4ff" : "#ffd166";
    const width = fx.weapon === "sniper" ? 5 : fx.weapon === "shottie" ? 3 : fx.weapon === "watergun" ? 7 : 4;
    const duration = fx.weapon === "watergun" ? 160 : fx.weapon === "sniper" ? 420 : 360;
    const pellets = Array.from({ length: pelletCount }, (_, i) => {
      if (pelletCount === 1) return [from, to] as const;
      const angle = i * 2.399;
      const spread = (0.22 + (i % 3) * 0.13) * Math.min(1, distance / 26);
      const offset = right.clone().multiplyScalar(Math.cos(angle) * spread).add(up.clone().multiplyScalar(Math.sin(angle) * spread));
      const pelletTo = to.clone().add(offset);
      return [from, pelletTo] as const;
    });
    return { color, duration, pellets, width };
  }, [from, fx.weapon, to]);
  useFrame(() => {
    if (!group.current) return;
    const age = Math.min(1, (performance.now() - createdAt.current) / shot.duration);
    group.current.children.forEach((child, i) => {
      const [start, end] = shot.pellets[i] ?? shot.pellets[0];
      const head = start.clone().lerp(end, THREE.MathUtils.smoothstep(age, 0, 1));
      const tail = start.clone().lerp(end, Math.max(0, age - 0.16));
      const line = child as unknown as { geometry?: { setPositions?: (positions: number[]) => void }; material?: { opacity?: number } };
      line.geometry?.setPositions?.([tail.x, tail.y, tail.z, head.x, head.y, head.z]);
      if (line.material) line.material.opacity = Math.max(0, 1 - age * 0.65);
    });
  });
  if (fx.explosion) {
    return <mesh position={[fx.explosion.x, fx.explosion.y, fx.explosion.z]}><sphereGeometry args={[2.6, 16, 12]} /><meshStandardMaterial color="#ff8a00" emissive="#ff3d00" emissiveIntensity={1.2} transparent opacity={0.55} /></mesh>;
  }
  return (
    <group ref={group}>
      {shot.pellets.map(([start, end], i) => (
        <Line key={i} points={[start, end]} color={shot.color} lineWidth={shot.width} transparent opacity={0.95} />
      ))}
    </group>
  );
}

function GrenadeProjectile({ position }: { position: Vec3 }) {
  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh castShadow>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color="#2f4f2f" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.24, 0]} castShadow>
        <boxGeometry args={[0.18, 0.06, 0.12]} />
        <meshStandardMaterial color="#1f2937" roughness={0.5} />
      </mesh>
      <mesh position={[0.09, 0.3, 0]} rotation={[0, 0, 0.45]} castShadow>
        <boxGeometry args={[0.12, 0.025, 0.025]} />
        <meshStandardMaterial color="#a3a3a3" metalness={0.25} roughness={0.4} />
      </mesh>
    </group>
  );
}

function ExplosionFx({ explosion }: { explosion: { position: Vec3; createdAt: number; radius: number } }) {
  const age = Math.min(1, (Date.now() - explosion.createdAt) / 650);
  return (
    <mesh position={[explosion.position.x, explosion.position.y, explosion.position.z]}>
      <sphereGeometry args={[1.2 + age * explosion.radius, 24, 16]} />
      <meshStandardMaterial color="#ffb020" emissive="#ff4d00" emissiveIntensity={1.1} transparent opacity={Math.max(0, 0.48 - age * 0.42)} />
    </mesh>
  );
}

function isTextInputActive() {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || (active instanceof HTMLElement && active.isContentEditable);
}

function RendererEvents() {
  const { gl } = useThree();
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      console.warn("WebGL context lost; rendering will resume when the browser restores it.");
    };
    const restored = () => console.info("WebGL context restored.");
    gl.domElement.addEventListener("webglcontextlost", lost, false);
    gl.domElement.addEventListener("webglcontextrestored", restored, false);
    return () => {
      gl.domElement.removeEventListener("webglcontextlost", lost);
      gl.domElement.removeEventListener("webglcontextrestored", restored);
    };
  }, [gl.domElement]);
  return null;
}
