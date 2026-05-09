import { MAX_PLAYERS, type GameMode, type PlayerSnapshot, type Team, type Vec3, WEAPONS } from "@veck/shared";

export function nextTeam(players: PlayerSnapshot[], mode: GameMode): Team {
  if (mode !== "Team Mode") return "none";
  const red = players.filter((p) => p.team === "red").length;
  const green = players.filter((p) => p.team === "green").length;
  return red <= green ? "red" : "green";
}

export function canDamage(attacker: PlayerSnapshot, victim: PlayerSnapshot, mode: GameMode): boolean {
  if (!attacker.alive || !victim.alive || attacker.id === victim.id) return false;
  if (mode === "Team Mode" && attacker.team === victim.team) return false;
  return true;
}

export function winner(players: PlayerSnapshot[], mode: GameMode): string {
  if (mode === "Team Mode") {
    const red = players.filter((p) => p.team === "red").reduce((sum, p) => sum + p.kills, 0);
    const green = players.filter((p) => p.team === "green").reduce((sum, p) => sum + p.kills, 0);
    if (red === green) return "Draw";
    return red > green ? "Red Team" : "Green Team";
  }
  const sorted = [...players].sort((a, b) => b.kills - a.kills);
  return sorted[0]?.kills ? sorted[0].name : "Draw";
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function rayPointDistance(origin: Vec3, dir: Vec3, point: Vec3): { distance: number; along: number } {
  const px = point.x - origin.x;
  const py = point.y - origin.y;
  const pz = point.z - origin.z;
  const along = px * dir.x + py * dir.y + pz * dir.z;
  const cx = origin.x + dir.x * along;
  const cy = origin.y + dir.y * along;
  const cz = origin.z + dir.z * along;
  return { distance: Math.hypot(point.x - cx, point.y + 0.6 - cy, point.z - cz), along };
}

export function validateJoin(count: number): string | null {
  return count >= MAX_PLAYERS ? "That match is full." : null;
}

export function weaponDamage(weaponId: keyof typeof WEAPONS, dist: number): number {
  const spec = WEAPONS[weaponId];
  if (weaponId === "grenade") return Math.max(0, Math.round(spec.damage * (1 - dist / 8)));
  if (weaponId === "shottie") return Math.max(5, Math.round(spec.damage * Math.max(0.2, 1 - dist / spec.range)));
  return spec.damage;
}
