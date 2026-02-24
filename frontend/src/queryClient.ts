import { QueryClient } from '@tanstack/react-query';

/**
 * Determine if a failed query should be retried.
 * - Don't retry 4xx (client errors) except 429 (rate limit).
 * - Retry network errors and 5xx up to 3 times.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false;

  if (error instanceof Error) {
    // Don't retry auth or validation errors
    if (error.message === 'Unauthorized') return false;
    if (error.message.match(/\(4\d{2}\)/) && !error.message.includes('(429)')) return false;
  }

  return true;
}

/**
 * Exponential backoff with jitter: 1s, 2s, 4s (capped).
 * For 429 responses, respects Retry-After if available.
 */
function retryDelay(attemptIndex: number, error: unknown): number {
  // Check for Retry-After hint stored on the error
  if (error instanceof Error && 'retryAfter' in error) {
    return (error as Error & { retryAfter: number }).retryAfter * 1000;
  }
  const base = Math.min(1000 * 2 ** attemptIndex, 8000);
  // Add jitter ±25%
  return base + base * 0.25 * (Math.random() - 0.5);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: shouldRetry,
      retryDelay,
    },
    mutations: {
      retry: false, // mutations should not auto-retry
    },
  },
});
