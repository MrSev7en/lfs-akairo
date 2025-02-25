export function randomString(length?: number): string {
  return Array.from({ length: length ?? 32 }, () =>
    Math.random().toString(36).charAt(2),
  ).join('');
}
