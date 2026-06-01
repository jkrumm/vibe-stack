import { QueryClient } from '@tanstack/react-query'

// Sensible defaults: don't refetch on every window focus, keep data fresh for 30s, retry once.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
