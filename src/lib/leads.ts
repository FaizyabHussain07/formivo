/** Human-readable labels for statuses shown in the UI (PRD §28). */

export const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "archived"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  archived: "Archived",
};
