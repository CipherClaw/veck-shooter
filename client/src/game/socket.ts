import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@veck/shared";
import { actions, useGame } from "../state/store";
import { beep } from "./audio";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();

socket.on("connect", () => {
  const s = useGame.getState();
  socket.emit("hello", { playerId: s.playerId, name: s.name });
});
socket.on("games", actions.games);
socket.on("stats", actions.stats);
socket.on("joined", actions.joined);
socket.on("snapshot", actions.snapshot);
socket.on("lobbyChat", actions.lobbyChat);
socket.on("gameChat", actions.gameChat);
socket.on("rejected", actions.error);
socket.on("shotFx", (fx) => {
  const state = useGame.getState();
  state.addFx(fx);
  if (state.scoped && fx.weapon === "sniper" && fx.shooterId === state.playerId) {
    const shotAt = Date.now();
    state.setScopeShotAt(shotAt);
    window.setTimeout(() => {
      if (useGame.getState().scopeShotAt === shotAt) useGame.getState().setScopeShotAt(0);
    }, 150);
  }
  beep(fx.explosion ? "explosion" : fx.weapon, state.muted);
});
socket.on("hit", () => beep("hit", useGame.getState().muted));
socket.on("killed", () => beep("kill", useGame.getState().muted));
