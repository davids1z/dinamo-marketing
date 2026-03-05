import { useState, useCallback } from 'react';

export interface FilterState {
  platform: string;
  dateRange: string;
  market: string;
  status: string;
  search: string;
}

const defaultFilters: FilterState = {
  platform: 'all',
  dateRange: '30d',
  market: 'all',
  status: 'all',
  search: '',
};

export function useFilters(initial?: Partial<FilterState>) {
  const [filters, setFilters] = useState<FilterState>({
    ...defaultFilters,
    ...initial,
  });

  const setFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters({ ...defaultFilters, ...initial });
  }, [initial]);

  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => value !== defaultFilters[key as keyof FilterState]
  );

  return { filters, setFilter, resetFilters, hasActiveFilters };
}
