/**
 * React Query hooks for the client — one per REST endpoint in server/routes.ts.
 *
 * The types below use a loose index signature so they auto-accept any column
 * declared in shared/columns.ts — no type edits required when adding or
 * dropping a data column.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types — accept any column shape defined in shared/columns.ts
// ---------------------------------------------------------------------------

/**
 * A server row. Identity columns are declared explicitly (they exist in every
 * deployment). Editable columns are accepted via the index signature — so
 * adding / removing a column in shared/columns.ts requires NO edit to this
 * file.
 */
export interface ProviderGroupOut {
  id: string;
  territory: string;
  market_head: string;
  state: string;
  pbg_number: string;
  pbg_name: string;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  /** Any editable column from shared/columns.ts. */
  [column: string]: string | null | undefined;
}

export type ProviderGroupCreate = { [key: string]: string | undefined };
export type ProviderGroupUpdate = { [key: string]: string | undefined };

export interface ProviderGroupListResponse {
  items: ProviderGroupOut[];
  total: number;
}

export class ApiError extends Error {
  constructor(public status: number, public statusText: string, public body: unknown) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text(); }
    throw new ApiError(res.status, res.statusText, body);
  }
  return res.status === 204 ? (undefined as T) : await res.json();
}

// ---------------------------------------------------------------------------
// Hooks (match the old signatures so grid.tsx doesn't change)
// ---------------------------------------------------------------------------

export function useListProviders<TData = { data: ProviderGroupListResponse }>(options?: {
  query?: Omit<UseQueryOptions<{ data: ProviderGroupListResponse }, ApiError, TData>, 'queryKey' | 'queryFn'>;
}) {
  return useQuery({
    queryKey: ['/api/providers'] as const,
    queryFn: async () => ({ data: await jsonFetch<ProviderGroupListResponse>('/api/providers') }),
    ...options?.query,
  });
}

/**
 * Fetches Unity Catalog column comments for the backing table. Used to
 * populate column tooltips — the data team can maintain these in UC via
 * `ALTER TABLE ... ALTER COLUMN ... COMMENT '...'` without code changes.
 *
 * Falls back to an empty map on error (client merges with shared/columns.ts
 * `definition` fallbacks).
 */
export interface SchemaResponse {
  column_comments: Record<string, string>;
}
export function useSchema<TData = { data: SchemaResponse }>(options?: {
  query?: Omit<UseQueryOptions<{ data: SchemaResponse }, ApiError, TData>, 'queryKey' | 'queryFn'>;
}) {
  return useQuery({
    queryKey: ['/api/schema'] as const,
    queryFn: async () => ({ data: await jsonFetch<SchemaResponse>('/api/schema') }),
    staleTime: 5 * 60_000, // same TTL as server cache
    ...options?.query,
  });
}

export function useCreateProvider(options?: {
  mutation?: UseMutationOptions<
    { data: ProviderGroupOut },
    ApiError,
    { params: Record<string, never>; data: ProviderGroupCreate }
  >;
}) {
  return useMutation({
    mutationFn: async (vars) => ({
      data: await jsonFetch<ProviderGroupOut>('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars.data),
      }),
    }),
    ...options?.mutation,
  });
}

export function useUpdateProvider(options?: {
  mutation?: UseMutationOptions<
    { data: ProviderGroupOut },
    ApiError,
    { params: { provider_id: string }; data: ProviderGroupUpdate }
  >;
}) {
  return useMutation({
    mutationFn: async (vars) => ({
      data: await jsonFetch<ProviderGroupOut>(`/api/providers/${vars.params.provider_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars.data),
      }),
    }),
    ...options?.mutation,
  });
}
