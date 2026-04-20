/**
 * Server-side types + column lists.
 *
 * All column metadata lives in `shared/columns.ts` (the single source of
 * truth shared between server and client). This file just re-exports the
 * server-relevant bits and provides the strict TypeScript type used for
 * responses.
 *
 * To ADD / DROP / RENAME a column: edit `shared/columns.ts`. Do NOT edit
 * this file for column changes.
 */

export {
  IDENTITY_KEYS as IDENTITY_FIELDS,
  EDITABLE_KEYS as EDITABLE_FIELDS,
  ALL_DATA_KEYS as ALL_DATA_FIELDS,
} from "../shared/columns";

/**
 * Output shape of a single provider group row. Indexed by column key.
 *
 * Since column set is dynamic (driven by shared/columns.ts), we type this
 * as a loose record. The server doesn't need stricter typing — routes
 * iterate ALL_DATA_FIELDS for all field operations. The client has stricter
 * types in `client/src/lib/api.ts` for ergonomic destructuring.
 */
export type ProviderGroupOut = {
  id: string;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
} & Record<string, string | null | undefined>;
