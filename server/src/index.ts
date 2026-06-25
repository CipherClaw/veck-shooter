import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@veck/shared";
import { validateName } from "./filter.js";
import { GameHub } from "./game.js";
import { StatsStore } from "./store.js";
import { ProfileHub } from "./profile.js";

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN?.split(",") ?? "*" }
});
const store = new StatsStore();
const profile = ProfileHub.fromEnv("veck-shooter");
const hub = new GameHub(store, profile);
let lobbyChat: Parameters<ServerToClientEvents["lobbyChat"]>[0] = [];

app.use(cors());
app.use(express.json());
app.get("/api/health", (_req, res) => res.json({ ok: true }));

const rootDir = fileURLToPath(new URL("../../", import.meta.url));
const clientDist = join(rootDir, "client", "dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => res.sendFile(join(clientDist, "index.html")));

io.on("connection", (socket) => {
  let playerId = "";
  let currentGame = "";

  socket.emit("games", hub.summaries());
  socket.emit("lobbyChat", lobbyChat);

  socket.on("hello", async ({ playerId: id, name, glToken }) => {
    const valid = validateName(name);
    if (!valid.ok) {
      socket.emit("rejected", valid.reason);
      return;
    }
    playerId = id;
    let stats = hub.hello(playerId, valid.name);
    if (glToken && profile) {
      const linked = await profile.resolve(glToken);
      if (linked) {
        hub.linkHub(playerId, linked.id, linked.coins);
        stats = { ...stats, coins: linked.coins };
      }
    }
    socket.emit("stats", stats);
    socket.emit("games", hub.summaries());
  });

  socket.on("setName", (name) => {
    if (!playerId) return;
    const valid = validateName(name);
    if (!valid.ok) return socket.emit("rejected", valid.reason);
    socket.emit("stats", hub.hello(playerId, valid.name));
  });

  socket.on("createGame", (payload) => {
    if (!playerId) return;
    const gameId = hub.create(playerId, socket.id, payload);
    currentGame = gameId;
    socket.join(gameId);
    socket.emit("joined", gameId, playerId);
    io.emit("games", hub.summaries());
  });

  socket.on("joinGame", ({ gameId, weapon }) => {
    if (!playerId) return;
    const result = hub.join(playerId, socket.id, gameId, weapon);
    if (!result.ok) return socket.emit("rejected", result.reason);
    currentGame = gameId;
    socket.join(gameId);
    socket.emit("joined", gameId, playerId);
    socket.emit("gameChat", hub.gameChat(gameId));
    io.emit("games", hub.summaries());
  });

  socket.on("leaveGame", () => {
    if (!playerId) return;
    socket.leave(currentGame);
    hub.leave(playerId);
    currentGame = "";
    io.emit("games", hub.summaries());
  });

  socket.on("input", (input) => playerId && hub.input(playerId, input));
  socket.on("reload", (weapon) => playerId && hub.reload(playerId, weapon));
  socket.on("respawn", (weapon) => playerId && hub.respawn(playerId, weapon));

  socket.on("fire", (payload) => {
    if (!playerId || !currentGame) return;
    const fx = hub.fire(playerId, payload);
    if (fx) io.to(currentGame).emit("shotFx", fx);
  });

  socket.on("chat", (payload) => {
    if (!playerId) return;
    const msg = hub.chat(playerId, payload.scope, payload.text, payload.gameId);
    if (!msg) return;
    if (payload.scope === "lobby") {
      lobbyChat = [...lobbyChat.slice(-34), msg];
      io.emit("lobbyChat", lobbyChat);
    } else if (payload.gameId) {
      io.to(payload.gameId).emit("gameChat", hub.gameChat(payload.gameId));
    }
  });

  socket.on("disconnect", () => {
    if (!playerId) return;
    hub.leave(playerId);
    io.emit("games", hub.summaries());
  });
});

setInterval(() => {
  for (const snapshot of hub.tick()) {
    io.to(snapshot.game.id).emit("snapshot", snapshot);
    for (const event of hub.drainDamageEvents(snapshot.game.id)) {
      io.to(event.attackerSocketId).emit("hit", event.damage);
      if (event.killed) io.to(event.attackerSocketId).emit("killed", event.killed);
    }
  }
  for (const emit of hub.drainStatsEmits()) io.to(emit.socketId).emit("stats", emit.stats);
  io.emit("games", hub.summaries());
}, 1000 / 20);

const port = Number(process.env.PORT ?? 3000);
httpServer.listen(port, () => console.log(`Veck Shooter listening on ${port}`));
