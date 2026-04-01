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
  priceRange?: number;
  radius?: number;
  cuisines?: string[];
};

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  priceLevel: 1 | 2 | 3;
  miles: number;
  imageUri: string;
  menuImageUri: string;
  dietaryRestrictions: string;
  websiteUrl: string;
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
    priceLevel: 1,
    miles: 0.2,
    imageUri:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
    menuImageUri: 'https://www.theolivegarden-menu.com/wp-content/uploads/2025/07/theolivegarden-menu-min-scaled.webp',
    dietaryRestrictions: 'Contains: gluten, dairy, eggs, soy. Vegetarian and gluten-free pasta available. Cross contamination possible. Some vegan options (salad, minestrone).',
    websiteUrl: 'https://www.olivegarden.com/',
  },
  {
    id: 'r2',
    name: "Raising Cane's",
    cuisine: 'American Cuisine',
    priceLevel: 1,
    miles: 0.4,
    imageUri:
      'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400',
    menuImageUri: 'https://b.zmtcdn.com/data/menus/848/16887848/76d9f19907f05248c485cbecb2087c2d.jpg',
    dietaryRestrictions: 'Contains: gluten, dairy, eggs. Most items fried in shared oil. Limited vegetarian options. No certified vegan or gluten-free kitchen.',
    websiteUrl: 'https://www.raisingcanes.com/',
  },
  {
    id: 'r3',
    name: 'Dragonfly',
    cuisine: 'Asian Cuisine',
    priceLevel: 3,
    miles: 0.6,
    imageUri:
      'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400',
    menuImageUri: 'https://www.dragonflyrestaurants.com/wp-content/uploads/2016/09/MD-Menu-2016-Robata.png',
    dietaryRestrictions: 'Contains: fish, shellfish, soy, gluten. Gluten-free soy sauce available. Vegetarian rolls available. Cross contamination possible.',
    websiteUrl: 'https://dragonflyrestaurants.com/',
  },
  {
    id: 'r4',
    name: 'The Top',
    cuisine: 'American Cuisine',
    priceLevel: 2,
    miles: 0.3,
    imageUri:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    menuImageUri: 'https://image.zmenu.com/menupic/4713533/w_20191102001817710815.jpg',
    dietaryRestrictions: 'Contains: gluten, dairy, eggs, soy. Vegan and vegetarian options available. Gluten-free buns on request. Cross contamination possible.',
    websiteUrl: 'https://www.thetophub.com/',
  },
  {
    id: 'r5',
    name: 'Satchel’s Pizza',
    cuisine: 'American Cuisine',
    priceLevel: 2,
    miles: 0.5,
    imageUri:
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
    menuImageUri: 'https://images.squarespace-cdn.com/content/v1/58fc1fb7be6594f266d63b72/0edddc0b-852a-4eb5-a1cc-5d5cc4b94039/Satch+Menu+Back.jpg?format=750w',
    dietaryRestrictions: 'Contains: gluten, dairy, eggs. Vegan cheese and gluten-free crust available. Cross contamination possible. Most pizzas can be made vegetarian.',
    websiteUrl: 'https://www.satchelspizza.com/',
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

export type UserProfile = {
  username: string;
  fullName: string;
  email: string;
};

type ManeCourseContextValue = {
  groups: Group[];
  currentUser: UserProfile;
  updateCurrentUser: (updates: Partial<UserProfile>) => void;
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

function buildDeckForGroup(groupId: string, factor: number, groups: Group[]): string[] {
  const g = groups.find((x) => x.id === groupId);
  let filtered = POOL;
  if (g) {
    if (typeof g.priceRange === 'number') {
      filtered = filtered.filter(r => r.priceLevel <= g.priceRange!);
    }
    if (typeof g.radius === 'number') {
      filtered = filtered.filter(r => r.miles <= g.radius!);
    }
    if (g.cuisines && g.cuisines.length > 0) {
      filtered = filtered.filter(r => g.cuisines!.some(cuisine => r.cuisine.toLowerCase().includes(cuisine.toLowerCase())));
    }
  }
  if (filtered.length === 0) return [];
  // Each restaurant appears at most once
  return filtered.map(r => r.id);
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
  const [groupsList, setGroupsList] = useState<Group[]>(MOCK_GROUPS);
  const [extraMembers, setExtraMembers] = useState<Record<string, string[]>>(
    {},
  );
  const [session, setSession] = useState<SessionState>(defaultSession);
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    username: 'Jdoe121',
    fullName: 'John Doe',
    email: 'Jdoe121@gmail.com',
  });

  const groups = useMemo(() => groupsList, [groupsList]);

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
    const deckIds = buildDeckForGroup(groupId, restaurantsPerMemberFactor, groupsList);
    setSession({
      ...defaultSession,
      groupId,
      deckIds,
      round: 1,
    });
  }, [groupsList, restaurantsPerMemberFactor]);

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

  const updateCurrentUser = useCallback((updates: Partial<UserProfile>) => {
    setCurrentUser((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const createGroup = useCallback((data: { name: string; members: string[]; priceRange?: number; radius?: number; cuisines?: string[] }) => {
    const newId = `${Date.now()}`;
    const newGroup: Group = {
      id: newId,
      name: data.name,
      memberCount: data.members.length,
      imageKey: 'roku', // default image
      priceRange: data.priceRange,
      radius: data.radius,
      cuisines: data.cuisines,
    };
    setGroupsList((prev) => [...prev, newGroup]);
    // Add members to the group
    if (data.members.length > 0) {
      setExtraMembers((m) => ({
        ...m,
        [newId]: data.members,
      }));
    }
    return newGroup;
  }, []);

  const deleteGroup = useCallback((groupId: string) => {
    setGroupsList((prev) => prev.filter((g) => g.id !== groupId));
    setExtraMembers((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
    setSession((prev) => (prev.groupId === groupId ? defaultSession : prev));
  }, []);

  const updateGroupSettings = useCallback((groupId: string, updates: { priceRange?: number; radius?: number; cuisines?: string[] }) => {
    setGroupsList((prev) => prev.map(g => g.id === groupId ? { ...g, ...updates } : g));
  }, []);

  const value: ManeCourseContextValue = {
    groups,
    currentUser,
    updateCurrentUser,
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
    createGroup,
    deleteGroup,
    updateGroupSettings,
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
