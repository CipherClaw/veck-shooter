import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PlayerStats } from "@veck/shared";

const defaultStats: PlayerStats = { kills: 0, deaths: 0, wins: 0, gamesPlayed: 0, coins: 0 };

export class StatsStore {
  private db: Database.Database;

  constructor(filename = process.env.SQLITE_PATH ?? join(fileURLToPath(new URL("../../", import.meta.url)), "server", "data", "veck.sqlite")) {
    mkdirSync(dirname(filename), { recursive: true });
    this.db = new Database(filename);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kills INTEGER NOT NULL DEFAULT 0,
        deaths INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        gamesPlayed INTEGER NOT NULL DEFAULT 0,
        coins INTEGER NOT NULL DEFAULT 0
      )
    `);
  }

  ensure(id: string, name: string): PlayerStats {
    this.db.prepare("INSERT INTO players (id, name) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name").run(id, name);
    return this.get(id);
  }

  get(id: string): PlayerStats {
    const row = this.db.prepare("SELECT kills, deaths, wins, gamesPlayed, coins FROM players WHERE id=?").get(id) as PlayerStats | undefined;
    return row ?? { ...defaultStats };
  }

  add(id: string, patch: Partial<PlayerStats>): PlayerStats {
    this.db
      .prepare(
        `UPDATE players SET
          kills = kills + @kills,
          deaths = deaths + @deaths,
          wins = wins + @wins,
          gamesPlayed = gamesPlayed + @gamesPlayed,
          coins = coins + @coins
        WHERE id = @id`
      )
      .run({ id, kills: patch.kills ?? 0, deaths: patch.deaths ?? 0, wins: patch.wins ?? 0, gamesPlayed: patch.gamesPlayed ?? 0, coins: patch.coins ?? 0 });
    return this.get(id);
  }
}
