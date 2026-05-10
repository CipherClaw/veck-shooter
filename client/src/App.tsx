import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, MessageSquare, Volume2, VolumeX } from "lucide-react";
import { DURATIONS, MAPS, WEAPONS, type GameMode, type GameSnapshot, type MapName, type WeaponId } from "@veck/shared";
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
  const { snapshot, playerId, gameId, gameChat, weapon, setWeapon, muted, scoped } = useGame();
  const [chatOpen, setChatOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [returnSeconds, setReturnSeconds] = useState(13);
  const me = snapshot?.players.find((p) => p.id === playerId);
  const scores = useMemo(() => snapshot?.players.slice().sort((a, b) => b.kills - a.kills) ?? [], [snapshot]);
  const ended = snapshot?.game.status === "ended";

  const returnToLobby = () => {
    socket.emit("leaveGame");
    useGame.setState({ gameId: "", snapshot: undefined });
  };

  useEffect(() => {
    if (!ended) return;
    setChatOpen(false);
    setPaused(false);
    document.exitPointerLock?.();
    const update = () => {
      const target = snapshot?.game.returnToLobbyAt ?? Date.now() + 13_000;
      const next = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setReturnSeconds(next);
      if (next <= 0) returnToLobby();
    };
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [ended, snapshot?.game.returnToLobbyAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = isTypingTarget(e.target);
      if (typing) {
        if (e.code === "Escape" && chatOpen) setChatOpen(false);
        return;
      }
      if (e.code === "Enter" && !ended) {
        e.preventDefault();
        setChatOpen(true);
        document.exitPointerLock?.();
        return;
      }
      if (e.code === "Escape") {
        if (chatOpen) setChatOpen(false);
        else if (!ended) setPaused((p) => !p);
        return;
      }
      if (ended) return;
      if (e.code === "KeyR") {
        socket.emit("reload", weapon);
        beep("reload", muted);
      }
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < weaponIds.length) setWeapon(weaponIds[idx]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatOpen, ended, muted, setWeapon, weapon]);

  if (!snapshot) return <div className="loading">Loading match...</div>;
  return (
    <main className="match">
      <GameCanvas />
      <div className="hud topbar">
        <div>{snapshot.game.map}</div>
        <strong>{formatTime(snapshot.game.timeRemainingMs)}</strong>
        <div>{snapshot.game.mode}</div>
      </div>
      {scoped && <ScopeOverlay />}
      {!ended && !scoped && <div className="crosshair"><Crosshair size={28} /></div>}
      <div className="hud scoreboard">
        {scores.map((p) => <div key={p.id} className={p.id === playerId ? "mine" : ""}><span>{p.name}</span><b>{p.kills}/{p.deaths}</b></div>)}
      </div>
      <div className="hud killfeed">{snapshot.killFeed.map((k) => <div key={k}>{k}</div>)}</div>
      {!ended && <div className="hud weapon-hud">
        <WeaponSelect weapon={weapon} setWeapon={setWeapon} compact />
        <div className="ammo-card">
          <span>{WEAPONS[weapon].name}</span>
          <strong>{ammoText(me, weapon)}</strong>
        </div>
      </div>}
      <ChatPanel messages={gameChat} scope="game" gameId={gameId} compact open={chatOpen} setOpen={setChatOpen} />
      {!ended && !me?.alive && (
        <div className="modal">
          <h2>Respawning</h2>
          <WeaponSelect weapon={weapon} setWeapon={setWeapon} />
          <button className="primary" onClick={() => socket.emit("respawn", weapon)}>Respawn</button>
          <button onClick={() => { socket.emit("leaveGame"); useGame.setState({ gameId: "", snapshot: undefined }); }}>Back to Lobby</button>
        </div>
      )}
      {ended && <RoundSummary snapshot={snapshot} playerId={playerId} returnSeconds={returnSeconds} onReturn={returnToLobby} />}
      {paused && <div className="modal help"><h2>Paused</h2><p>WASD move, mouse look, click fire, right click sniper scope, R reload, Shift sprint, Space jump, Enter opens chat, Enter sends, Escape closes chat, 1-5 weapons.</p><button onClick={() => setPaused(false)}>Resume</button></div>}
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
  const inputRef = useRef<HTMLInputElement>(null);
  const send = () => {
    if (!text.trim()) return;
    socket.emit("chat", { scope, gameId, text });
    setText("");
    setOpen?.(false);
  };
  useEffect(() => {
    if (!open) return;
    document.exitPointerLock?.();
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);
  return (
    <section className={`chat ${compact ? "compact" : "panel"} ${open ? "open" : ""}`}>
      {!compact && <h2><MessageSquare size={18} /> Chat</h2>}
      <div className="messages">
        {messages.length === 0 && <div className="chat-placeholder">Press Enter to chat</div>}
        {messages.slice(-8).map((m) => <div key={m.id}><b>{m.name}</b><span>{m.text}</span></div>)}
      </div>
      {compact && !open && <div className="chat-hint">Press Enter to chat</div>}
      {(!compact || open) && <div className="row"><input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") send();
        if (e.key === "Escape") {
          setText("");
          setOpen?.(false);
        }
      }} autoFocus={open} placeholder={open ? "Type message..." : "Press Enter to chat"} /><button onClick={send}>Send</button></div>}
    </section>
  );
}

function ScopeOverlay() {
  return (
    <div className="scope-overlay">
      <div className="scope-ring">
        <span className="scope-line horizontal" />
        <span className="scope-line vertical" />
      </div>
    </div>
  );
}

function RoundSummary({ snapshot, playerId, returnSeconds, onReturn }: { snapshot: GameSnapshot; playerId: string; returnSeconds: number; onReturn: () => void }) {
  const players = snapshot.players.slice().sort((a, b) => {
    if (snapshot.game.mode === "Team Mode" && a.team !== b.team) return teamOrder(a.team) - teamOrder(b.team);
    return b.kills - a.kills || a.deaths - b.deaths || a.name.localeCompare(b.name);
  });
  const red = snapshot.players.filter((p) => p.team === "red").reduce((sum, p) => sum + p.kills, 0);
  const green = snapshot.players.filter((p) => p.team === "green").reduce((sum, p) => sum + p.kills, 0);
  return (
    <div className="modal round-summary">
      <h2>Round Summary</h2>
      <div className="summary-winner">
        {snapshot.game.mode === "Team Mode" ? <>Winning team: <strong>{snapshot.winner ?? "Draw"}</strong></> : <>Winner: <strong>{snapshot.winner ?? "Draw"}</strong></>}
      </div>
      {snapshot.game.mode === "Team Mode" && <div className="team-totals"><span>Red {red}</span><span>Green {green}</span></div>}
      <div className="summary-table">
        <div className="summary-row header"><span>#</span><span>Player</span><span>K</span><span>D</span><span>K/D</span><span>Coins</span></div>
        {players.map((p, i) => {
          const won = snapshot.game.mode === "Team Mode" ? `${p.team === "red" ? "Red" : "Green"} Team` === snapshot.winner : p.name === snapshot.winner;
          return <div key={p.id} className={`summary-row ${p.id === playerId ? "mine" : ""}`}><span>{i + 1}</span><span>{snapshot.game.mode === "Team Mode" ? `${p.team === "red" ? "Red" : "Green"} · ${p.name}` : p.name}</span><span>{p.kills}</span><span>{p.deaths}</span><span>{formatKd(p.kills, p.deaths)}</span><span>{won ? 25 : 10}</span></div>;
        })}
      </div>
      <p>Returning to lobby in {returnSeconds}...</p>
      <button className="primary" onClick={onReturn}>Return now</button>
    </div>
  );
}

function formatTime(ms: number) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function formatKd(kills: number, deaths: number) {
  if (deaths === 0) return kills ? `${kills}.0` : "0.0";
  return (kills / deaths).toFixed(1);
}

function teamOrder(team: string) {
  if (team === "red") return 0;
  if (team === "green") return 1;
  return 2;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}

function ammoText(player: { ammo: Record<WeaponId, number>; reloadingWeapon?: WeaponId; reloadingUntil?: number } | undefined, weapon: WeaponId) {
  if (!player) return "";
  if (player.reloadingWeapon === weapon && player.reloadingUntil && Date.now() < player.reloadingUntil) return "Reloading...";
  const current = Math.max(0, player.ammo[weapon] ?? WEAPONS[weapon].ammo);
  if (weapon === "watergun") return `${(current / 20).toFixed(1)}s / ${(WEAPONS[weapon].ammo / 20).toFixed(0)}s`;
  return `${current} / ${WEAPONS[weapon].ammo}`;
}
