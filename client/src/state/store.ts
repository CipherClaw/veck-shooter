import { create } from "zustand";
import type { ChatMessage, GameSnapshot, GameSummary, PlayerStats, WeaponId } from "@veck/shared";

const savedId = localStorage.getItem("veck.playerId") ?? crypto.randomUUID();
localStorage.setItem("veck.playerId", savedId);

export type Fx = { id: number; from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number }; weapon: WeaponId; hit?: { x: number; y: number; z: number }; explosion?: { x: number; y: number; z: number } };

type State = {
  playerId: string;
  name: string;
  stats: PlayerStats;
  games: GameSummary[];
  gameId: string;
  snapshot?: GameSnapshot;
  lobbyChat: ChatMessage[];
  gameChat: ChatMessage[];
  weapon: WeaponId;
  muted: boolean;
  scoped: boolean;
  fx: Fx[];
  error: string;
  setName: (name: string) => void;
  setWeapon: (weapon: WeaponId) => void;
  addFx: (fx: Omit<Fx, "id">) => void;
  clearFx: (id: number) => void;
  setMuted: (muted: boolean) => void;
  setScoped: (scoped: boolean) => void;
};

export const useGame = create<State>((set) => ({
  playerId: savedId,
  name: localStorage.getItem("veck.name") ?? "Guest" + Math.floor(Math.random() * 900 + 100),
  stats: JSON.parse(localStorage.getItem("veck.stats") ?? "{\"kills\":0,\"deaths\":0,\"wins\":0,\"gamesPlayed\":0,\"coins\":0}"),
  games: [],
  gameId: "",
  lobbyChat: [],
  gameChat: [],
  weapon: "revolver",
  muted: localStorage.getItem("veck.muted") === "true",
  scoped: false,
  fx: [],
  error: "",
  setName: (name) => {
    localStorage.setItem("veck.name", name);
    set({ name });
  },
  setWeapon: (weapon) => set({ weapon }),
  addFx: (fx) => {
    const id = Date.now() + Math.random();
    set((s) => ({ fx: [...s.fx.slice(-16), { ...fx, id }] }));
    window.setTimeout(() => useGame.getState().clearFx(id), fx.explosion ? 900 : fx.weapon === "watergun" ? 180 : 520);
  },
  clearFx: (id) => set((s) => ({ fx: s.fx.filter((f) => f.id !== id) })),
  setMuted: (muted) => {
    localStorage.setItem("veck.muted", String(muted));
    set({ muted });
  },
  setScoped: (scoped) => set({ scoped })
}));

export const actions = {
  games: (games: GameSummary[]) => useGame.setState({ games }),
  stats: (stats: PlayerStats) => {
    localStorage.setItem("veck.stats", JSON.stringify(stats));
    useGame.setState({ stats });
  },
  joined: (gameId: string) => useGame.setState({ gameId }),
  snapshot: (snapshot: GameSnapshot) => useGame.setState({ snapshot }),
  lobbyChat: (lobbyChat: ChatMessage[]) => useGame.setState({ lobbyChat }),
  gameChat: (gameChat: ChatMessage[]) => useGame.setState({ gameChat }),
  error: (error: string) => useGame.setState({ error })
};
