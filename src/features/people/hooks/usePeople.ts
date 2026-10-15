import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { peopleService, type PeopleQuery } from "../services/peopleService";

export const peopleKeys = {
  all: ["people"] as const,
  list: (query: PeopleQuery) => ["people", query] as const,
  celebrations: (days: number) => ["people", "celebrations", days] as const,
};

export function usePeople(query: PeopleQuery = {}) {
  return useQuery({
    queryKey: peopleKeys.list(query),
    queryFn: ({ signal }) => peopleService.list(query, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useCelebrations(days = 14) {
  return useQuery({ queryKey: peopleKeys.celebrations(days), queryFn: ({ signal }) => peopleService.celebrations(days, { signal }), staleTime: 10 * 60_000 });
}
