/** Demo accounts — must match backend `VALID_USERS` in `backend/app.py`. */
export const SAMPLE_USERNAMES = [
  'gator1',
  'gator2',
  'gator3',
  'gator4',
  'gator5',
] as const;

export const SAMPLE_PASSWORD = 'password';

const SAMPLE_SET = new Set<string>(SAMPLE_USERNAMES);

export function isSampleAccount(username: string, password: string): boolean {
  return SAMPLE_SET.has(username.trim().toLowerCase()) && password === SAMPLE_PASSWORD;
}
