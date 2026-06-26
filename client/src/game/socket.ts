import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents, Vec3 } from "@veck/shared";
import { actions, useGame } from "../state/store";
import { beep } from "./audio";
import { glIdentity } from "../greglab";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();
let heardExplosionIds = new Set<string>();

socket.on("connect", () => {
  const s = useGame.getState();
  socket.emit("hello", { playerId: s.playerId, name: s.name, glToken: glIdentity.token ?? undefined });
  if (s.gameId) socket.emit("joinGame", { gameId: s.gameId, weapon: s.weapon });
});
socket.on("games", actions.games);
socket.on("stats", actions.stats);
socket.on("joined", actions.joined);
socket.on("snapshot", (snapshot) => {
  const state = useGame.getState();
  const previousLocalPlayer = state.snapshot?.players.find((p) => p.id === state.playerId);
  const nextLocalPlayer = snapshot.players.find((p) => p.id === state.playerId);
  const listener = previousLocalPlayer?.position ?? nextLocalPlayer?.position;
  const nextExplosionIds = new Set(snapshot.explosions.map((explosion) => explosion.id));
  for (const explosion of snapshot.explosions) {
    if (!heardExplosionIds.has(explosion.id)) beep("explosion", state.muted, spatialVolume(listener, explosion.position));
  }
  if (previousLocalPlayer?.alive && nextLocalPlayer?.alive && nextLocalPlayer.health > previousLocalPlayer.health) beep("heal", state.muted);
  heardExplosionIds = nextExplosionIds;
  actions.snapshot(snapshot);
});
socket.on("lobbyChat", actions.lobbyChat);
socket.on("gameChat", actions.gameChat);
socket.on("rejected", (reason) => {
  const s = useGame.getState();
  if (s.gameId) useGame.setState({ gameId: "", snapshot: undefined, paused: false });
  actions.error(reason);
});
socket.on("shotFx", (fx) => {
  const state = useGame.getState();
  const listener = state.snapshot?.players.find((p) => p.id === state.playerId)?.position;
  state.addFx(fx);
  if (state.scoped && fx.weapon === "sniper" && fx.shooterId === state.playerId) {
    const shotAt = Date.now();
    state.setScopeShotAt(shotAt);
    window.setTimeout(() => {
      if (useGame.getState().scopeShotAt === shotAt) useGame.getState().setScopeShotAt(0);
    }, 150);
  }
  const source = fx.explosion ?? fx.from;
  const volume = fx.shooterId === state.playerId ? 1 : spatialVolume(listener, source);
  beep(fx.explosion ? "explosion" : fx.weapon, state.muted, volume);
});
socket.on("hit", () => beep("hit", useGame.getState().muted));
socket.on("killed", () => beep("kill", useGame.getState().muted));

function spatialVolume(listener: Vec3 | undefined, source: Vec3) {
  if (!listener) return 1;
  const distance = Math.hypot(listener.x - source.x, listener.y - source.y, listener.z - source.z);
  if (distance <= 14) return 1;
  if (distance >= 75) return 0;
  return Math.max(0, Math.min(1, 1 - (distance - 14) / 61));
}
