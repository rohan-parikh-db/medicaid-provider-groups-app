/**
 * React Query selector — unwraps `{ data: T }` responses returned by
 * the API client into just `T` for ergonomic destructuring.
 *
 * Usage:
 *   const { data: result } = useListProviders({ ...selector() });
 *   // result is now ProviderGroupListResponse, not { data: ... }
 */
export const selector = <T>() => ({
  query: {
    select: (data: { data: T }) => data.data,
  },
});

export default selector;
