import { create } from "zustand";
import { glIdentity } from "../greglab";
import type { ChatMessage, GameSnapshot, GameSummary, PlayerStats, WeaponId } from "@veck/shared";

const savedId = localStorage.getItem("veck.playerId") ?? crypto.randomUUID();
localStorage.setItem("veck.playerId", savedId);

export type Fx = { id: number; shooterId: string; from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number }; weapon: WeaponId; hit?: { x: number; y: number; z: number }; explosion?: { x: number; y: number; z: number } };
export type PracticeTargetFx = { id: number; targetId: string; position: { x: number; y: number; z: number }; createdAt: number };

const practiceTargetTimers = new Map<string, number>();
const practiceTargetFxTimers = new Map<number, number>();
const PRACTICE_TARGET_RESPAWN_MS = 3000;
const PRACTICE_TARGET_FX_MS = 520;

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
  scopeShotAt: number;
  stamina: number;
  paused: boolean;
  fx: Fx[];
  hiddenPracticeTargets: Record<string, true>;
  practiceTargetFx: PracticeTargetFx[];
  error: string;
  setName: (name: string) => void;
  setWeapon: (weapon: WeaponId) => void;
  addFx: (fx: Omit<Fx, "id">) => void;
  clearFx: (id: number) => void;
  hitPracticeTarget: (targetId: string, position: { x: number; y: number; z: number }) => boolean;
  clearPracticeTargetFx: (id: number) => void;
  resetPracticeTargets: () => void;
  setMuted: (muted: boolean) => void;
  setScoped: (scoped: boolean) => void;
  setScopeShotAt: (scopeShotAt: number) => void;
  setStamina: (stamina: number) => void;
  setPaused: (paused: boolean) => void;
};

export const useGame = create<State>((set) => ({
  playerId: savedId,
  name: glIdentity.name ?? localStorage.getItem("veck.name") ?? "Guest" + Math.floor(Math.random() * 900 + 100),
  stats: JSON.parse(localStorage.getItem("veck.stats") ?? "{\"kills\":0,\"deaths\":0,\"wins\":0,\"gamesPlayed\":0,\"coins\":0}"),
  games: [],
  gameId: "",
  lobbyChat: [],
  gameChat: [],
  weapon: "revolver",
  muted: localStorage.getItem("veck.muted") === "true",
  scoped: false,
  scopeShotAt: 0,
  stamina: 1,
  paused: false,
  fx: [],
  hiddenPracticeTargets: {},
  practiceTargetFx: [],
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
  hitPracticeTarget: (targetId, position) => {
    if (useGame.getState().hiddenPracticeTargets[targetId]) return false;
    window.clearTimeout(practiceTargetTimers.get(targetId));
    const fxId = Date.now() + Math.random();
    set((s) => ({
      hiddenPracticeTargets: { ...s.hiddenPracticeTargets, [targetId]: true },
      practiceTargetFx: [...s.practiceTargetFx.slice(-10), { id: fxId, targetId, position, createdAt: performance.now() }]
    }));
    practiceTargetFxTimers.set(fxId, window.setTimeout(() => useGame.getState().clearPracticeTargetFx(fxId), PRACTICE_TARGET_FX_MS));
    practiceTargetTimers.set(targetId, window.setTimeout(() => {
      practiceTargetTimers.delete(targetId);
      set((s) => {
        const hiddenPracticeTargets = { ...s.hiddenPracticeTargets };
        delete hiddenPracticeTargets[targetId];
        return { hiddenPracticeTargets };
      });
    }, PRACTICE_TARGET_RESPAWN_MS));
    return true;
  },
  clearPracticeTargetFx: (id) => {
    window.clearTimeout(practiceTargetFxTimers.get(id));
    practiceTargetFxTimers.delete(id);
    set((s) => ({ practiceTargetFx: s.practiceTargetFx.filter((fx) => fx.id !== id) }));
  },
  resetPracticeTargets: () => {
    practiceTargetTimers.forEach((timer) => window.clearTimeout(timer));
    practiceTargetFxTimers.forEach((timer) => window.clearTimeout(timer));
    practiceTargetTimers.clear();
    practiceTargetFxTimers.clear();
    set({ hiddenPracticeTargets: {}, practiceTargetFx: [] });
  },
  setMuted: (muted) => {
    localStorage.setItem("veck.muted", String(muted));
    set({ muted });
  },
  setScoped: (scoped) => set({ scoped }),
  setScopeShotAt: (scopeShotAt) => set({ scopeShotAt }),
  setStamina: (stamina) => set({ stamina }),
  setPaused: (paused) => set({ paused })
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
