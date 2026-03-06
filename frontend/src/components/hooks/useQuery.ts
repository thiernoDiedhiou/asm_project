// Hook simplifié pour les requêtes API (sans React Query, dépendance allégée)
import { useState, useEffect, useCallback, useRef } from 'react';
import { AxiosResponse } from 'axios';

interface UseQueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

interface UseQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useQuery<T>(
  key: (string | number | undefined | null)[],
  queryFn: () => Promise<AxiosResponse<T>>,
  options: UseQueryOptions = {}
): UseQueryResult<T> {
  const { enabled = true, refetchInterval } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const keyString = key.join(':');
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchData = useCallback(async () => {
    if (!enabled) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await queryFn();
      setData(response.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Erreur de chargement';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyString, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refetchInterval) {
      intervalRef.current = setInterval(fetchData, refetchInterval);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [fetchData, refetchInterval]);

  return { data, isLoading, error, refetch: fetchData };
}
