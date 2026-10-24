/**
 * Shared row shapes for Supabase `select()` results.
 *
 * These mirror the columns pages actually read from `forms` and `leads`.
 * Query-specific shapes that include extra joins stay local to their page.
 */

export interface FormRow {
  id: string;
  public_id: string;
  name: string;
  status: string;
  created_at: string;
}

export interface LeadRow {
  id: string;
  data: Record<string, unknown> | null;
  created_at: string;
  /** Present when the query selects it; not every page needs lead status. */
  status?: string;
}