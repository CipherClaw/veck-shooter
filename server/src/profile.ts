// Typed client for the greglab-games profile hub (https://games.greglab.net).
// Server-to-server only: holds the shared PROFILE_API_KEY, never exposed to clients.
export type HubProfile = {
  id: string;
  displayName: string;
  coins: number;
  totals: { gamesPlayed: number };
  games: Record<string, { stats: Record<string, number>; gamesPlayed: number }>;
};

export type ReportDeltas = {
  coinsDelta?: number;
  statsDelta?: Record<string, number>;
  statsSet?: Record<string, unknown>;
  gamesPlayedDelta?: number;
  reason?: string;
};

export type ReportResult = { coins: number; stats: Record<string, number>; gamesPlayed: number };

export class ProfileHub {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private gameId: string,
    private timeoutMs = 5000
  ) {}

  static fromEnv(gameId: string): ProfileHub | null {
    const baseUrl = process.env.PROFILE_API_URL;
    const apiKey = process.env.PROFILE_API_KEY;
    if (!baseUrl || !apiKey) {
      console.log("[hub] PROFILE_API_URL/PROFILE_API_KEY not set; cross-game profile disabled.");
      return null;
    }
    console.log(`[hub] cross-game profile enabled via ${baseUrl}`);
    return new ProfileHub(baseUrl.replace(/\/+$/, ""), apiKey, gameId);
  }

  private async call(method: string, path: string, body?: unknown): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(this.baseUrl + path, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err: any = new Error(data.error ?? `hub_${res.status}`);
        err.status = res.status;
        throw err;
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  // Resolve a client token to a canonical profile, or null if missing/invalid/unreachable.
  async resolve(token?: string): Promise<HubProfile | null> {
    if (!token) return null;
    try {
      const { profile } = await this.call("POST", "/api/profile/resolve", { token });
      return profile as HubProfile;
    } catch (err) {
      console.warn("[hub] resolve failed:", (err as Error).message);
      return null;
    }
  }

  // Apply coin/stat deltas; returns the updated snapshot, or null on failure.
  async report(playerId: string, deltas: ReportDeltas): Promise<ReportResult | null> {
    try {
      const { result } = await this.call("POST", `/api/games/${encodeURIComponent(this.gameId)}/report`, {
        playerId,
        ...deltas
      });
      return result as ReportResult;
    } catch (err) {
      console.warn("[hub] report failed:", (err as Error).message);
      return null;
    }
  }
}
