import { useEffect, useMemo, useState } from "react";
import { Crosshair, MessageSquare, Volume2, VolumeX } from "lucide-react";
import { DURATIONS, MAPS, WEAPONS, type GameMode, type MapName, type WeaponId } from "@veck/shared";
import { useGame } from "./state/store";
import { socket } from "./game/socket";
import { beep } from "./game/audio";
import { GameCanvas } from "./components/GameCanvas";

const weaponIds = Object.keys(WEAPONS) as WeaponId[];

export default function App() {
  const gameId = useGame((s) => s.gameId);
  return gameId ? <Match /> : <Lobby />;
}

function Lobby() {
  const { name, setName, stats, games, lobbyChat, weapon, setWeapon, muted, setMuted, error } = useGame();
  const [draft, setDraft] = useState(name);
  const [map, setMap] = useState<MapName>("Pyramid");
  const [mode, setMode] = useState<GameMode>("Free Play");
  const [durationMinutes, setDuration] = useState(5);

  const saveName = () => {
    setName(draft);
    socket.emit("setName", draft);
  };
  const create = () => {
    saveName();
    socket.emit("createGame", { map, mode, durationMinutes, weapon });
  };

  return (
    <main className="lobby">
      <div className="ambient-scene">
        <GameCanvas />
      </div>
      <section className="lobby-shell">
        <header className="brand">
          <div>
            <h1>Veck Shooter</h1>
            <p>Blocky browser arena FPS</p>
          </div>
          <button className="icon-btn" onClick={() => setMuted(!muted)} title="Toggle sound">{muted ? <VolumeX /> : <Volume2 />}</button>
        </header>
        {error && <div className="error">{error}</div>}
        <div className="lobby-grid">
          <Panel title="Player">
            <label>Name</label>
            <div className="row">
              <input value={draft} minLength={3} maxLength={18} onChange={(e) => setDraft(e.target.value)} onBlur={saveName} />
              <button onClick={saveName}>Save</button>
            </div>
            <div className="stats">
              <Stat label="Kills" value={stats.kills} />
              <Stat label="Deaths" value={stats.deaths} />
              <Stat label="Wins" value={stats.wins} />
              <Stat label="Games" value={stats.gamesPlayed} />
              <Stat label="Coins" value={stats.coins} />
            </div>
            <div className="coming">Store coming soon</div>
          </Panel>
          <Panel title="Create Match">
            <label>Map</label>
            <Segmented options={MAPS} value={map} onChange={(v) => setMap(v as MapName)} />
            <label>Mode</label>
            <Segmented options={["Free Play", "Team Mode"]} value={mode} onChange={(v) => setMode(v as GameMode)} />
            <label>Duration</label>
            <Segmented options={DURATIONS.map(String)} value={String(durationMinutes)} onChange={(v) => setDuration(Number(v))} />
            <WeaponSelect weapon={weapon} setWeapon={setWeapon} />
            <button className="primary" onClick={create}>Create Game</button>
          </Panel>
          <Panel title="Active Games" className="wide">
            <div className="games">
              {games.length === 0 && <div className="empty">No active games. Create one.</div>}
              {games.map((game) => (
                <div className="game-row" key={game.id}>
                  <div>
                    <strong>{game.map}</strong>
                    <span>{game.mode} · {game.durationMinutes} min · {formatTime(game.timeRemainingMs)}</span>
                  </div>
                  <span>{game.playerCount}/{game.maxPlayers}</span>
                  <button disabled={game.playerCount >= game.maxPlayers || game.status === "ended"} onClick={() => socket.emit("joinGame", { gameId: game.id, weapon })}>Join</button>
                </div>
              ))}
            </div>
          </Panel>
          <ChatPanel messages={lobbyChat} scope="lobby" />
        </div>
      </section>
    </main>
  );
}

function Match() {
  const { snapshot, playerId, gameId, gameChat, weapon, setWeapon, muted } = useGame();
  const [chatOpen, setChatOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const me = snapshot?.players.find((p) => p.id === playerId);
  const scores = useMemo(() => snapshot?.players.slice().sort((a, b) => b.kills - a.kills) ?? [], [snapshot]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Enter") setChatOpen(true);
      if (e.code === "Escape") setPaused((p) => !p);
      if (e.code === "KeyR") {
        socket.emit("reload", weapon);
        beep("reload", muted);
      }
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < weaponIds.length) setWeapon(weaponIds[idx]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [muted, setWeapon, weapon]);

  if (!snapshot) return <div className="loading">Loading match...</div>;
  return (
    <main className="match">
      <GameCanvas />
      <div className="hud topbar">
        <div>{snapshot.game.map}</div>
        <strong>{formatTime(snapshot.game.timeRemainingMs)}</strong>
        <div>{snapshot.game.mode}</div>
      </div>
      <div className="crosshair"><Crosshair size={28} /></div>
      <div className="hud scoreboard">
        {scores.map((p) => <div key={p.id} className={p.id === playerId ? "mine" : ""}><span>{p.name}</span><b>{p.kills}/{p.deaths}</b></div>)}
      </div>
      <div className="hud killfeed">{snapshot.killFeed.map((k) => <div key={k}>{k}</div>)}</div>
      <div className="hud weapon-hud">
        <WeaponSelect weapon={weapon} setWeapon={setWeapon} compact />
        <div className="ammo">{WEAPONS[weapon].name}</div>
      </div>
      <ChatPanel messages={gameChat} scope="game" gameId={gameId} compact open={chatOpen} setOpen={setChatOpen} />
      {(!me?.alive || snapshot.game.status === "ended") && (
        <div className="modal">
          <h2>{snapshot.game.status === "ended" ? `Winner: ${snapshot.winner}` : "Respawning"}</h2>
          <WeaponSelect weapon={weapon} setWeapon={setWeapon} />
          <button className="primary" onClick={() => socket.emit("respawn", weapon)} disabled={snapshot.game.status === "ended"}>Respawn</button>
          <button onClick={() => { socket.emit("leaveGame"); useGame.setState({ gameId: "", snapshot: undefined }); }}>Back to Lobby</button>
        </div>
      )}
      {paused && <div className="modal help"><h2>Paused</h2><p>WASD move, mouse look, click fire, right click sniper scope, R reload, Shift sprint, Space jump, Enter chat, 1-5 weapons.</p><button onClick={() => setPaused(false)}>Resume</button></div>}
    </main>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><h2>{title}</h2>{children}</section>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div><b>{value}</b><span>{label}</span></div>;
}

function Segmented({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (value: string) => void }) {
  return <div className="segmented">{options.map((o) => <button key={o} className={o === value ? "active" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>;
}

function WeaponSelect({ weapon, setWeapon, compact = false }: { weapon: WeaponId; setWeapon: (weapon: WeaponId) => void; compact?: boolean }) {
  return (
    <div className={`weapon-select ${compact ? "compact" : ""}`}>
      {weaponIds.map((id, i) => <button key={id} className={weapon === id ? "active" : ""} onClick={() => setWeapon(id)}><span>{i + 1}</span>{WEAPONS[id].name}</button>)}
    </div>
  );
}

function ChatPanel({ messages, scope, gameId, compact = false, open, setOpen }: { messages: { id: string; name: string; text: string; at: number }[]; scope: "lobby" | "game"; gameId?: string; compact?: boolean; open?: boolean; setOpen?: (v: boolean) => void }) {
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim()) return;
    socket.emit("chat", { scope, gameId, text });
    setText("");
    setOpen?.(false);
  };
  return (
    <section className={`chat ${compact ? "compact" : "panel"} ${open ? "open" : ""}`}>
      {!compact && <h2><MessageSquare size={18} /> Chat</h2>}
      <div className="messages">{messages.slice(-8).map((m) => <div key={m.id}><b>{m.name}</b><span>{m.text}</span></div>)}</div>
      {(!compact || open) && <div className="row"><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} autoFocus={open} placeholder="Say something" /><button onClick={send}>Send</button></div>}
    </section>
  );
}

function formatTime(ms: number) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
