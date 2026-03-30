export type Vote = {
  restaurantId: string;
  userId: string;
  like: boolean;
};

export function countLikes(votes: Vote[], restaurantId: string): number {
  return votes.filter((v) => v.restaurantId === restaurantId && v.like).length;
}

export function findTopRestaurantIds(restaurantIds: string[], votes: Vote[]): string[] {
  if (restaurantIds.length === 0) return [];
  const counts = restaurantIds.map((id) => ({
    id,
    c: countLikes(votes, id),
  }));
  const max = Math.max(...counts.map((x) => x.c), 0);
  if (max === 0) return [];
  return counts.filter((x) => x.c === max).map((x) => x.id);
}

/** True if sorted id lists are identical (same tie set as previous round). */
export function sameTieSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((id, i) => id === sb[i]);
}
