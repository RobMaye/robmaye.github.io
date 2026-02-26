/**
 * Estimates reading time for a body of text.
 * Returns a human-readable string like "3 min read".
 */
export function readingTime(text: string): string {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / wordsPerMinute));
  return `${minutes} min read`;
}
