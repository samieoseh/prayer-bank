import { useQuery } from '@tanstack/react-query';

import { usePrayerRepository } from '@/features/prayers/hooks/use-prayer-repository';
import type { PrayerRequestStatus } from '@/features/prayers/types/prayer';

export const prayerQueryKeys = {
  root: ['prayers'] as const,
  categories: ['prayers', 'categories'] as const,
  lists: ['prayers', 'lists'] as const,
  list: (status: PrayerRequestStatus) => ['prayers', 'lists', status] as const,
  answers: ['prayers', 'answers'] as const,
  details: ['prayers', 'details'] as const,
  detail: (requestId: string) => ['prayers', 'details', requestId] as const,
};

export function usePrayerCategoriesQuery() {
  const repository = usePrayerRepository();

  return useQuery({
    queryKey: prayerQueryKeys.categories,
    queryFn: async () => {
      const result = await repository.listCategories();
      if (!result.ok) throw new Error(result.message);
      return result.value;
    },
    staleTime: Infinity,
  });
}

export function usePrayerRequestsQuery(status: PrayerRequestStatus) {
  const repository = usePrayerRepository();

  return useQuery({
    queryKey: prayerQueryKeys.list(status),
    queryFn: async () => {
      const result = await repository.listRequests(status);
      if (!result.ok) throw new Error(result.message);
      return result.value;
    },
    staleTime: Infinity,
  });
}

export function usePrayerRequestQuery(requestId?: string) {
  const repository = usePrayerRepository();

  return useQuery({
    enabled: Boolean(requestId),
    queryKey: prayerQueryKeys.detail(requestId ?? 'missing'),
    queryFn: async () => {
      const result = await repository.getRequest(requestId!);
      if (!result.ok) throw new Error(result.message);
      return result.value;
    },
    staleTime: Infinity,
  });
}

export function useAnsweredPrayersQuery() {
  const repository = usePrayerRepository();

  return useQuery({
    queryKey: prayerQueryKeys.answers,
    queryFn: async () => {
      const result = await repository.listAnsweredPrayers();
      if (!result.ok) throw new Error(result.message);
      return result.value;
    },
    staleTime: Infinity,
  });
}
