import type { ReactNode } from 'react';
export type SortOption = { token: string; direction: 'ascending' | 'descending' };

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;

  sorts?: SortOption[];
  align?: 'right';

  secondary?: boolean;
};

export type DataTableProps<T> = {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  page: number;
  pages: number;
  total: number;

  limit: number;
  onPage: (page: number) => void;
  sort?: string;
  onSort?: (sort: string) => void;
  isPending?: boolean;

  isFetching?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: string;
};

export function nextSort(column: Column<unknown>, current?: string): string | null {
  const sorts = column.sorts;
  if (!sorts || sorts.length === 0) return null;

  const at = sorts.findIndex((option) => option.token === current);
  const next = at === -1 ? sorts[0] : sorts[(at + 1) % sorts.length];
  return next?.token ?? null;
}

export function sortStateOf(
  column: Column<unknown>,
  current?: string
): 'ascending' | 'descending' | 'none' {
  return column.sorts?.find((option) => option.token === current)?.direction ?? 'none';
}
