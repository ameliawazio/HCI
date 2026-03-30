import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  findTopRestaurantIds,
  sameTieSet,
  type Vote,
} from '../lib/voting';

export type Group = {
  id: string;
  name: string;
  memberCount: number;
  imageKey: 'roku' | 'house';
};

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  priceLevel: 1 | 2 | 3;
  miles: number;
  imageUri: string;
};

const MOCK_GROUPS: Group[] = [
  { id: '1', name: 'The Roku Remotes', memberCount: 4, imageKey: 'roku' },
  { id: '2', name: 'Family', memberCount: 6, imageKey: 'house' },
];

const POOL: Restaurant[] = [
  {
    id: 'r1',
    name: 'Olive Garden',
    cuisine: 'Italian Cuisine',
    priceLevel: 3,
    miles: 0.2,
    imageUri:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
  },
  {
    id: 'r2',
    name: "Raising Cane's",
    cuisine: 'American Cuisine',
    priceLevel: 3,
    miles: 0.4,
    imageUri:
      'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400',
  },
  {
    id: 'r3',
    name: 'Dragonfly',
    cuisine: 'Sushi',
    priceLevel: 2,
    miles: 0.6,
    imageUri:
      'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400',
  },
  {
    id: 'r4',
    name: 'The Top',
    cuisine: 'American Cuisine',
    priceLevel: 2,
    miles: 0.3,
    imageUri:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
  },
  {
    id: 'r5',
    name: 'Satchel’s Pizza',
    cuisine: 'Pizza',
    priceLevel: 2,
    miles: 0.5,
    imageUri:
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
  },
];

const MEMBER_USERNAMES = ['Bogi', 'Olivia', 'Lucas', 'Zach', 'Amelia'];

export type SessionState = {
  groupId: string | null;
  /** Deck for current swipe round */
  deckIds: string[];
  votes: Vote[];
  round: number;
  /** Sorted tie set from previous round (to detect repeat tie) */
  previousTieIds: string[] | null;
  staleTieMessage: boolean;
  winnerId: string | null;
};

type ManeCourseContextValue = {
  groups: Group[];
  currentUser: { username: string; fullName: string; email: string };
  groupMembersByGroupId: Record<string, string[]>;
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

function buildDeckForGroup(groupId: string, factor: number): string[] {
  const g = MOCK_GROUPS.find((x) => x.id === groupId);
  const n = g ? Math.max(1, g.memberCount * factor) : 5;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(POOL[i % POOL.length].id);
  }
  return out;
}

function randomLike(): boolean {
  return Math.random() > 0.35;
}

function computeSessionAfterWaiting(prev: SessionState): SessionState {
  if (!prev.groupId) return prev;
  const g = MOCK_GROUPS.find((x) => x.id === prev.groupId);
  const memberCount = g?.memberCount ?? 4;
  const simCount = Math.max(0, memberCount - 1);
  const simIds = Array.from({ length: simCount }, (_, i) => `sim${i}`);

  const votes: Vote[] = [...prev.votes];
  for (const rid of prev.deckIds) {
    for (const uid of simIds) {
      if (votes.some((v) => v.userId === uid && v.restaurantId === rid)) {
        continue;
      }
      votes.push({
        restaurantId: rid,
        userId: uid,
        like: randomLike(),
      });
    }
  }

  const topIds = findTopRestaurantIds(prev.deckIds, votes);
  if (topIds.length === 0) {
    return { ...prev, votes, winnerId: prev.deckIds[0] ?? null };
  }
  if (topIds.length === 1) {
    return { ...prev, votes, winnerId: topIds[0]! };
  }

  const tieSorted = [...topIds].sort();
  const staleTie =
    prev.previousTieIds !== null &&
    sameTieSet(prev.previousTieIds, tieSorted) &&
    prev.round >= 2;

  if (staleTie) {
    return {
      ...prev,
      votes,
      winnerId: topIds[0]!,
      staleTieMessage: true,
    };
  }

  return {
    ...prev,
    votes: [],
    deckIds: topIds,
    round: prev.round + 1,
    previousTieIds: tieSorted,
    staleTieMessage: false,
    winnerId: null,
  };
}

export function ManeCourseProvider({ children }: { children: React.ReactNode }) {
  const [extraMembers, setExtraMembers] = useState<Record<string, string[]>>(
    {},
  );
  const [session, setSession] = useState<SessionState>(defaultSession);

  const groups = useMemo(() => MOCK_GROUPS, []);

  const groupMembersByGroupId = useMemo(() => {
    const base: Record<string, string[]> = {
      '1': ['Bogi', 'Olivia', 'Lucas', 'Zach'],
      '2': ['Mom', 'Dad', 'Alex', 'Sam', 'Jamie', 'River'],
      new: [],
    };
    const merged = { ...base };
    for (const [gid, list] of Object.entries(extraMembers)) {
      merged[gid] = [...(merged[gid] || []), ...list];
    }
    return merged;
  }, [extraMembers]);

  const getRestaurantsByIds = useCallback((ids: string[]) => {
    const map = new Map(POOL.map((r) => [r.id, r]));
    return ids.map((id) => map.get(id)!).filter(Boolean);
  }, []);

  const restaurantsPerMemberFactor = 3;

  const startSwipeSession = useCallback((groupId: string) => {
    const deckIds = buildDeckForGroup(groupId, restaurantsPerMemberFactor);
    setSession({
      ...defaultSession,
      groupId,
      deckIds,
      round: 1,
    });
  }, [restaurantsPerMemberFactor]);

  const recordSwipe = useCallback((restaurantId: string, like: boolean) => {
    setSession((prev) => {
      const me = 'me';
      const without = prev.votes.filter(
        (v) => !(v.userId === me && v.restaurantId === restaurantId),
      );
      return {
        ...prev,
        votes: [...without, { restaurantId, userId: me, like }],
      };
    });
  }, []);

  const finishLocalSwipes = useCallback(() => {
    // votes from "me" are already recorded; waiting screen will simulate others
  }, []);

  const resolveAfterWaiting = useCallback(() => {
    let next!: SessionState;
    setSession((prev) => {
      next = computeSessionAfterWaiting(prev);
      return next;
    });
    return next;
  }, []);

  const resetSession = useCallback(() => {
    setSession(defaultSession);
  }, []);

  const addMemberToGroup = useCallback((groupId: string, username: string) => {
    const u = username.trim();
    if (!u) return;
    setExtraMembers((m) => ({
      ...m,
      [groupId]: [...(m[groupId] || []), u],
    }));
  }, []);

  const value: ManeCourseContextValue = {
    groups,
    currentUser: {
      username: 'Jdoe121',
      fullName: 'John Doe',
      email: 'Jdoe121@gmail.com',
    },
    groupMembersByGroupId,
    getRestaurantsByIds,
    restaurantsPerMemberFactor,
    session,
    startSwipeSession,
    recordSwipe,
    finishLocalSwipes,
    resolveAfterWaiting,
    resetSession,
    addMemberToGroup,
  };

  return (
    <ManeCourseContext.Provider value={value}>{children}</ManeCourseContext.Provider>
  );
}

export function useManeCourse() {
  const ctx = useContext(ManeCourseContext);
  if (!ctx) {
    throw new Error('useManeCourse must be used within ManeCourseProvider');
  }
  return ctx;
}

export { MOCK_GROUPS, MEMBER_USERNAMES, POOL };
