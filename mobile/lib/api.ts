export type AuthUser = {
  id: number;
  username: string;
  email: string;
  fullName: string;
};

export type GroupSettings = {
  radiusMiles: number;
  priceMin: number;
  priceMax: number;
  cuisines: string[];
};

export type GroupSummary = {
  id: number;
  name: string;
  memberCount: number;
  hostUserId?: number;
  youAreHost?: boolean;
  settings: GroupSettings;
};

export type RoundSummary = {
  id: number;
  roundNumber: number;
};

export type RestaurantDeckItem = {
  placeId: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  priceLevel?: number;
  cuisine?: string;
  photoUrl?: string;
  placeUrl?: string;
  distanceMiles: number;
  position: number;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  token?: string | null;
  body?: unknown;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:5000";

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export const api = {
  baseUrl: API_BASE_URL,
  signup: (payload: {
    username: string;
    email: string;
    fullName: string;
    password: string;
  }) =>
    apiRequest<{ token: string; user: AuthUser }>("/api/auth/signup", {
      method: "POST",
      body: payload,
    }),
  login: (payload: { username: string; password: string }) =>
    apiRequest<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: payload,
    }),
  me: (token: string) => apiRequest<AuthUser>("/api/me", { token }),
  listGroups: (token: string) =>
    apiRequest<{ groups: GroupSummary[] }>("/api/groups", { token }),
  createGroup: (token: string, name: string) =>
    apiRequest<{ group: GroupSummary }>("/api/groups", {
      method: "POST",
      token,
      body: { name },
    }),
  deleteGroup: (token: string, groupId: number) =>
    apiRequest<{ ok: boolean }>(`/api/groups/${groupId}`, {
      method: "DELETE",
      token,
    }),
  getGroupSettings: (token: string, groupId: number) =>
    apiRequest<{
      group: GroupSummary;
      members: string[];
      swipeInProgress: boolean;
      pendingSwipeCount: number;
    }>(`/api/groups/${groupId}/settings`, { token }),
  updateGroupSettings: (
    token: string,
    groupId: number,
    payload: { name: string } & GroupSettings,
  ) =>
    apiRequest<{ group: GroupSummary }>(`/api/groups/${groupId}/settings`, {
      method: "PUT",
      token,
      body: payload,
    }),
  addMember: (token: string, groupId: number, username: string) =>
    apiRequest<{ ok: boolean }>(`/api/groups/${groupId}/members`, {
      method: "POST",
      token,
      body: { username },
    }),
  cancelActiveRound: (token: string, groupId: number) =>
    apiRequest<{ ok: boolean }>(`/api/groups/${groupId}/rounds/cancel`, {
      method: "POST",
      token,
      body: {},
    }),
  startRound: (
    token: string,
    groupId: number,
    location: { latitude: number; longitude: number },
  ) =>
    apiRequest<{ round: RoundSummary; deck: RestaurantDeckItem[] }>(
      `/api/groups/${groupId}/rounds/start`,
      {
        method: "POST",
        token,
        body: location,
      },
    ),
  getActiveRound: (token: string, groupId: number) =>
    apiRequest<{ round: RoundSummary | null; deck: RestaurantDeckItem[] }>(
      `/api/groups/${groupId}/rounds/active`,
      { token },
    ),
  submitVote: (
    token: string,
    roundId: number,
    payload: { placeId: string; liked: boolean },
  ) =>
    apiRequest<{ ok: boolean }>(`/api/rounds/${roundId}/votes`, {
      method: "POST",
      token,
      body: payload,
    }),
  completeRound: (token: string, roundId: number) =>
    apiRequest<{
      status: "waiting" | "resolved" | "next_round";
      winnerPlaceId?: string;
      staleTie?: boolean;
      nextRoundId?: number;
      completedCount?: number;
      totalCount?: number;
    }>(`/api/rounds/${roundId}/complete`, {
      method: "POST",
      token,
    }),
  getGroupResult: (token: string, groupId: number) =>
    apiRequest<{
      activeRound: RoundSummary | null;
      winner: {
        placeId: string;
        name: string;
        address?: string;
        distanceMiles: number;
        photoUrl?: string;
        cuisine?: string;
        priceLevel?: number;
        placeUrl?: string | null;
        staleTie?: boolean;
      } | null;
    }>(`/api/groups/${groupId}/result`, { token }),
};

