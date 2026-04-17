import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, type AuthUser, type GroupSummary, type RestaurantDeckItem, type RoundSummary } from "../lib/api";
import { getStoredToken, setStoredToken } from "../lib/authStorage";

export type Group = {
  id: string;
  name: string;
  memberCount: number;
  imageKey: "roku" | "house";
  youAreHost?: boolean;
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
  id: number;
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
  /** False until AsyncStorage session restore has finished (avoid treating user as logged out during load). */
  authHydrated: boolean;
  token: string | null;
  groups: Group[];
  currentUser: UserProfile | null;
  groupMembersByGroupId: Record<string, string[]>;
  activeRound: ActiveRound | null;
  roundVotes: Record<string, boolean>;
  /** Place id → restaurant for the active round deck (and related lookups). */
  restaurantMap: Record<string, Restaurant>;
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
  refreshGroups: () => Promise<Group[]>;
  createGroup: (data: { name: string; members: string[] }) => Promise<Group>;
  deleteGroup: (groupId: string) => Promise<void>;
  getGroupSettings: (groupId: string) => Promise<{
    group: GroupSummary;
    members: string[];
    swipeInProgress: boolean;
    pendingSwipeCount: number;
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
  /** Ends the current swipe round for the whole group (no active round after). */
  cancelActiveRound: (groupId: string) => Promise<{
    group: GroupSummary;
    members: string[];
    swipeInProgress: boolean;
    pendingSwipeCount: number;
  }>;
  ensureActiveRound: (
    groupId: string,
    location: { latitude: number; longitude: number },
    canStartRound: boolean,
  ) => Promise<ActiveRound | null>;
  recordSwipe: (placeId: string, liked: boolean) => void;
  /** Merges `includeVotes` on top of current round votes (use for the last card — React state is not updated yet). */
  submitAllVotes: (includeVotes?: Record<string, boolean>) => Promise<void>;
  completeRound: () => Promise<{
    status: "waiting" | "resolved" | "next_round";
  }>;
  pollGroupResult: (groupId: string) => Promise<{
    activeRound: RoundSummary | null;
    winner: Restaurant | null;
  }>;
  clearWinner: () => void;
  getRestaurantsByIds: (ids: string[]) => Restaurant[];
};

const ManeCourseContext = createContext<ManeCourseContextValue | null>(null);

function toGroup(g: GroupSummary): Group {
  return {
    id: String(g.id),
    name: g.name,
    memberCount: g.memberCount,
    imageKey: "roku",
    youAreHost: g.youAreHost,
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
  const [authHydrated, setAuthHydrated] = useState(false);
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
    const mapped = res.groups.map(toGroup);
    setGroups(mapped);
    return mapped;
  }, [requireToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await getStoredToken();
        if (cancelled) return;
        if (t) {
          try {
            const user = await api.me(t);
            if (cancelled) return;
            setToken(t);
            setCurrentUser({
              id: user.id,
              username: user.username,
              fullName: user.fullName,
              email: user.email,
            });
            const res = await api.listGroups(t);
            if (cancelled) return;
            setGroups(res.groups.map(toGroup));
          } catch {
            await setStoredToken(null);
            setToken(null);
            setCurrentUser(null);
            setGroups([]);
          }
        }
      } finally {
        if (!cancelled) setAuthHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hydrateAuth = useCallback((authToken: string, user: AuthUser) => {
    setToken(authToken);
    setCurrentUser({
      id: user.id,
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
        await setStoredToken(res.token);
        const list = await api.listGroups(res.token);
        setGroups(list.groups.map(toGroup));
      } finally {
        setLoading(false);
      }
    },
    [hydrateAuth],
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
        await setStoredToken(res.token);
        const list = await api.listGroups(res.token);
        setGroups(list.groups.map(toGroup));
      } finally {
        setLoading(false);
      }
    },
    [hydrateAuth],
  );

  const logout = useCallback(() => {
    void setStoredToken(null);
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
      // Do not clear activeRound here — it races with ensureActiveRound right after save
      // (React may apply the clear after captureDeck and wipe the new deck). The server
      // already aborts old rounds; next ensureActiveRound / swipe load replaces client state.
      setRoundVotes({});
      setLastWinner(null);
      setStaleTieMessage(false);
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

  const cancelActiveRound = useCallback(
    async (groupId: string) => {
      const t = requireToken();
      const id = Number.parseInt(String(groupId).trim(), 10);
      if (!Number.isFinite(id) || id < 1) {
        throw new Error("Invalid group id");
      }
      await api.cancelActiveRound(t, id);
      setActiveRound(null);
      setRoundVotes({});
      const res = await getGroupSettings(String(id));
      await refreshGroups();
      return res;
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
    async (
      groupId: string,
      location: { latitude: number; longitude: number },
      canStartRound: boolean,
    ) => {
      const t = requireToken();
      const active = await api.getActiveRound(t, Number(groupId));
      if (active.round) {
        return captureDeck(groupId, active.round.id, active.round.roundNumber, active.deck);
      }
      if (!canStartRound) {
        setActiveRound(null);
        setRoundVotes({});
        setLastWinner(null);
        setStaleTieMessage(false);
        return null;
      }
      const started = await api.startRound(t, Number(groupId), location);
      return captureDeck(groupId, started.round.id, started.round.roundNumber, started.deck);
    },
    [captureDeck, requireToken],
  );

  const recordSwipe = useCallback((placeId: string, liked: boolean) => {
    setRoundVotes((prev) => ({ ...prev, [placeId]: liked }));
  }, []);

  const submitAllVotes = useCallback(
    async (includeVotes?: Record<string, boolean>) => {
      const t = requireToken();
      if (!activeRound) {
        throw new Error("No active round");
      }
      const allVotes = { ...roundVotes, ...includeVotes };
      for (const [placeId, liked] of Object.entries(allVotes)) {
        await api.submitVote(t, activeRound.id, { placeId, liked });
      }
    },
    [activeRound, requireToken, roundVotes],
  );

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
        setLastWinner(null);
        setStaleTieMessage(false);
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
            placeUrl: state.winner.placeUrl || undefined,
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
      authHydrated,
      token,
      groups,
      currentUser,
      groupMembersByGroupId,
      activeRound,
      roundVotes,
      restaurantMap,
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
      cancelActiveRound,
      ensureActiveRound,
      recordSwipe,
      submitAllVotes,
      completeRound,
      pollGroupResult,
      clearWinner,
      getRestaurantsByIds,
    }),
    [
      authHydrated,
      token,
      groups,
      currentUser,
      groupMembersByGroupId,
      activeRound,
      roundVotes,
      restaurantMap,
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
      cancelActiveRound,
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
