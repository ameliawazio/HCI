import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { api, type AuthUser, type GroupSummary, type RestaurantDeckItem, type RoundSummary } from "../lib/api";

export type Group = {
  id: string;
  name: string;
  memberCount: number;
  imageKey: "roku" | "house";
};

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  priceLevel: 1 | 2 | 3 | 4;
  miles: number;
  imageUri: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  placeUrl?: string;
};

export type UserProfile = {
  username: string;
  fullName: string;
  email: string;
};

export type ActiveRound = {
  id: number;
  groupId: string;
  roundNumber: number;
  deck: RestaurantDeckItem[];
};

type ManeCourseContextValue = {
  token: string | null;
  groups: Group[];
  currentUser: UserProfile | null;
  groupMembersByGroupId: Record<string, string[]>;
  activeRound: ActiveRound | null;
  roundVotes: Record<string, boolean>;
  lastWinner: Restaurant | null;
  staleTieMessage: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (payload: {
    username: string;
    fullName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  refreshGroups: () => Promise<void>;
  createGroup: (data: { name: string; members: string[] }) => Promise<Group>;
  deleteGroup: (groupId: string) => Promise<void>;
  getGroupSettings: (groupId: string) => Promise<{
    group: GroupSummary;
    members: string[];
  }>;
  saveGroupSettings: (
    groupId: string,
    payload: {
      name: string;
      radiusMiles: number;
      priceMin: number;
      priceMax: number;
      cuisines: string[];
    },
  ) => Promise<void>;
  addMemberToGroup: (groupId: string, username: string) => Promise<void>;
  ensureActiveRound: (
    groupId: string,
    location: { latitude: number; longitude: number },
  ) => Promise<ActiveRound>;
  recordSwipe: (placeId: string, liked: boolean) => void;
  submitAllVotes: () => Promise<void>;
  completeRound: () => Promise<{
    status: "waiting" | "resolved" | "next_round";
  }>;
  pollGroupResult: (groupId: string) => Promise<{
    activeRound: RoundSummary | null;
    winner: Restaurant | null;
  }>;
  clearWinner: () => void;
  getRestaurantsByIds: (ids: string[]) => Restaurant[];
  /** restaurants shown = members × factor (demo) */
  restaurantsPerMemberFactor: number;
  session: SessionState;
  startSwipeSession: (groupId: string) => void;
  recordSwipe: (restaurantId: string, like: boolean) => void;
  /** Called when local user finished swiping current deck */
  finishLocalSwipes: () => void;
  /** Simulates other members + resolves winner or next round */
  /** Resolves simulated votes; returns next session (sync). */
  resolveAfterWaiting: () => SessionState;
  resetSession: () => void;
  addMemberToGroup: (groupId: string, username: string) => void;
  createGroup: (data: { name: string; members: string[]; priceRange?: number; radius?: number; cuisines?: string[] }) => Group;
  updateGroupSettings?: (groupId: string, updates: { priceRange?: number; radius?: number; cuisines?: string[] }) => void;
  deleteGroup: (groupId: string) => void;
};

const defaultSession: SessionState = {
  groupId: null,
  deckIds: [],
  votes: [],
  round: 1,
  previousTieIds: null,
  staleTieMessage: false,
  winnerId: null,
};

const ManeCourseContext = createContext<ManeCourseContextValue | null>(null);

export const MEMBER_USERNAMES = ["Bogi", "Olivia", "Lucas", "Zach", "Amelia"];

function toGroup(g: GroupSummary): Group {
  return {
    id: String(g.id),
    name: g.name,
    memberCount: g.memberCount,
    imageKey: "roku",
  };
}

function toRestaurant(item: RestaurantDeckItem): Restaurant {
  return {
    id: item.placeId,
    name: item.name,
    cuisine: item.cuisine || "Restaurant",
    priceLevel: ((item.priceLevel || 1) as 1 | 2 | 3 | 4),
    miles: item.distanceMiles,
    imageUri:
      item.photoUrl ||
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
    address: item.address,
    latitude: item.latitude,
    longitude: item.longitude,
    placeUrl: item.placeUrl,
  };
}

export function ManeCourseProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [groupMembersByGroupId, setGroupMembersByGroupId] = useState<
    Record<string, string[]>
  >({});
  const [activeRound, setActiveRound] = useState<ActiveRound | null>(null);
  const [roundVotes, setRoundVotes] = useState<Record<string, boolean>>({});
  const [restaurantMap, setRestaurantMap] = useState<Record<string, Restaurant>>({});
  const [lastWinner, setLastWinner] = useState<Restaurant | null>(null);
  const [staleTieMessage, setStaleTieMessage] = useState(false);
  const [loading, setLoading] = useState(false);

  const requireToken = useCallback(() => {
    if (!token) {
      throw new Error("Not logged in");
    }
    return token;
  }, [token]);

  const refreshGroups = useCallback(async () => {
    const t = requireToken();
    const res = await api.listGroups(t);
    setGroups(res.groups.map(toGroup));
  }, [requireToken]);

  const hydrateAuth = useCallback((authToken: string, user: AuthUser) => {
    setToken(authToken);
    setCurrentUser({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
    });
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      try {
        const res = await api.login({ username, password });
        hydrateAuth(res.token, res.user);
        await refreshGroups();
      } finally {
        setLoading(false);
      }
    },
    [hydrateAuth, refreshGroups],
  );

  const signup = useCallback(
    async (payload: {
      username: string;
      fullName: string;
      email: string;
      password: string;
    }) => {
      setLoading(true);
      try {
        const res = await api.signup(payload);
        hydrateAuth(res.token, res.user);
        await refreshGroups();
      } finally {
        setLoading(false);
      }
    },
    [hydrateAuth, refreshGroups],
  );

  const logout = useCallback(() => {
    setToken(null);
    setCurrentUser(null);
    setGroups([]);
    setGroupMembersByGroupId({});
    setActiveRound(null);
    setRoundVotes({});
    setRestaurantMap({});
    setLastWinner(null);
    setStaleTieMessage(false);
  }, []);

  const createGroup = useCallback(
    async (data: { name: string; members: string[] }) => {
      const t = requireToken();
      const res = await api.createGroup(t, data.name);
      const created = toGroup(res.group);
      setGroups((prev) => [created, ...prev]);

      for (const username of data.members) {
        if (username.trim()) {
          await api.addMember(t, res.group.id, username.trim());
        }
      }
      await refreshGroups();
      return created;
    },
    [refreshGroups, requireToken],
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      const t = requireToken();
      await api.deleteGroup(t, Number(groupId));
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    },
    [requireToken],
  );

  const getGroupSettings = useCallback(
    async (groupId: string) => {
      const t = requireToken();
      const res = await api.getGroupSettings(t, Number(groupId));
      setGroupMembersByGroupId((prev) => ({
        ...prev,
        [groupId]: res.members,
      }));
      return res;
    },
    [requireToken],
  );

  const saveGroupSettings = useCallback(
    async (
      groupId: string,
      payload: {
        name: string;
        radiusMiles: number;
        priceMin: number;
        priceMax: number;
        cuisines: string[];
      },
    ) => {
      const t = requireToken();
      const res = await api.updateGroupSettings(t, Number(groupId), payload);
      const updated = toGroup(res.group);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? updated : g)));
    },
    [requireToken],
  );

  const addMemberToGroup = useCallback(
    async (groupId: string, username: string) => {
      const t = requireToken();
      await api.addMember(t, Number(groupId), username);
      await getGroupSettings(groupId);
      await refreshGroups();
    },
    [getGroupSettings, refreshGroups, requireToken],
  );

  const captureDeck = useCallback((groupId: string, roundId: number, roundNumber: number, deck: RestaurantDeckItem[]) => {
    const m: Record<string, Restaurant> = {};
    for (const item of deck) {
      m[item.placeId] = toRestaurant(item);
    }
    setRestaurantMap((prev) => ({ ...prev, ...m }));
    const round: ActiveRound = {
      id: roundId,
      groupId,
      roundNumber,
      deck,
    };
    setActiveRound(round);
    setRoundVotes({});
    setLastWinner(null);
    setStaleTieMessage(false);
    return round;
  }, []);

  const ensureActiveRound = useCallback(
    async (groupId: string, location: { latitude: number; longitude: number }) => {
      const t = requireToken();
      const active = await api.getActiveRound(t, Number(groupId));
      if (active.round) {
        return captureDeck(groupId, active.round.id, active.round.roundNumber, active.deck);
      }
      const started = await api.startRound(t, Number(groupId), location);
      return captureDeck(groupId, started.round.id, started.round.roundNumber, started.deck);
    },
    [captureDeck, requireToken],
  );

  const recordSwipe = useCallback((placeId: string, liked: boolean) => {
    setRoundVotes((prev) => ({ ...prev, [placeId]: liked }));
  }, []);

  const submitAllVotes = useCallback(async () => {
    const t = requireToken();
    if (!activeRound) {
      throw new Error("No active round");
    }
    for (const [placeId, liked] of Object.entries(roundVotes)) {
      await api.submitVote(t, activeRound.id, { placeId, liked });
    }
  }, [activeRound, requireToken, roundVotes]);

  const completeRound = useCallback(async () => {
    const t = requireToken();
    if (!activeRound) {
      throw new Error("No active round");
    }
    const result = await api.completeRound(t, activeRound.id);
    if (result.status === "next_round") {
      const next = await api.getActiveRound(t, Number(activeRound.groupId));
      if (next.round) {
        captureDeck(activeRound.groupId, next.round.id, next.round.roundNumber, next.deck);
      }
    }
    return { status: result.status };
  }, [activeRound, captureDeck, requireToken]);

  const pollGroupResult = useCallback(
    async (groupId: string) => {
      const t = requireToken();
      const state = await api.getGroupResult(t, Number(groupId));
      if (state.activeRound) {
        const active = await api.getActiveRound(t, Number(groupId));
        if (active.round) {
          captureDeck(groupId, active.round.id, active.round.roundNumber, active.deck);
        }
      }
      const winner = state.winner
        ? ({
            id: state.winner.placeId,
            name: state.winner.name,
            cuisine: state.winner.cuisine || "Restaurant",
            priceLevel: (state.winner.priceLevel || 1) as 1 | 2 | 3 | 4,
            miles: state.winner.distanceMiles,
            imageUri:
              state.winner.photoUrl ||
              "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
            address: state.winner.address,
          } as Restaurant)
        : null;
      setLastWinner(winner);
      setStaleTieMessage(Boolean(state.winner?.staleTie));
      return { activeRound: state.activeRound, winner };
    },
    [captureDeck, requireToken],
  );

  const clearWinner = useCallback(() => {
    setLastWinner(null);
    setStaleTieMessage(false);
  }, []);

  const getRestaurantsByIds = useCallback(
    (ids: string[]) => ids.map((id) => restaurantMap[id]).filter(Boolean),
    [restaurantMap],
  );

  const value = useMemo<ManeCourseContextValue>(
    () => ({
      token,
      groups,
      currentUser,
      groupMembersByGroupId,
      activeRound,
      roundVotes,
      lastWinner,
      staleTieMessage,
      loading,
      login,
      signup,
      logout,
      refreshGroups,
      createGroup,
      deleteGroup,
      getGroupSettings,
      saveGroupSettings,
      addMemberToGroup,
      ensureActiveRound,
      recordSwipe,
      submitAllVotes,
      completeRound,
      pollGroupResult,
      clearWinner,
      getRestaurantsByIds,
    }),
    [
      token,
      groups,
      currentUser,
      groupMembersByGroupId,
      activeRound,
      roundVotes,
      lastWinner,
      staleTieMessage,
      loading,
      login,
      signup,
      logout,
      refreshGroups,
      createGroup,
      deleteGroup,
      getGroupSettings,
      saveGroupSettings,
      addMemberToGroup,
      ensureActiveRound,
      recordSwipe,
      submitAllVotes,
      completeRound,
      pollGroupResult,
      clearWinner,
      getRestaurantsByIds,
    ],
  );

  return <ManeCourseContext.Provider value={value}>{children}</ManeCourseContext.Provider>;
}

export function useManeCourse() {
  const ctx = useContext(ManeCourseContext);
  if (!ctx) {
    throw new Error("useManeCourse must be used within ManeCourseProvider");
  }
  return ctx;
}
