import { fetchServices } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

const FIVE_MINUTES = 5 * 60 * 1000;

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
    staleTime: FIVE_MINUTES, // data is fresh for 5 minutes
    // background refetch every 5 minutes so data is refreshed after staleness
    refetchInterval: FIVE_MINUTES,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
