/**
 * ============================================================================
 * Column definitions — SINGLE SOURCE OF TRUTH for "what columns exist".
 * ============================================================================
 *
 * This file drives both:
 *   - the Express backend in server/* (which fields appear in INSERT/UPDATE)
 *   - the React UI in client/src/routes/grid.tsx (table, tooltips, filters,
 *     CSV export, inline-add form)
 *
 * To ADD a column: add a new entry to the COLUMNS array below.
 * To DROP a column: delete its entry.
 * To RENAME a column: change its `key` AND run an `ALTER TABLE ... RENAME
 *   COLUMN` against your Delta table.
 *
 * After any change here, you must ALSO:
 *   1. Run the matching ALTER TABLE in your Unity Catalog table.
 *   2. Redeploy the app.
 *
 * The ProviderGroupOut TypeScript type and the client's API request/response
 * shapes are all derived from this list — no other file needs editing.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// Column groups (visible as colored pills in the toolbar).
// Add / rename / re-color here. Set `id` to null on a column to make it
// always-visible identity / action (not part of a collapsible group).
// ---------------------------------------------------------------------------

export interface ColumnGroup {
  id: string;
  label: string;
  /** Tailwind bg + text classes for the toolbar pill + dark-mode variants. */
  color: string;
  /** Tailwind `border-t-*` class applied to the column header. */
  borderColor: string;
  /** Tailwind bg tint applied to the header cell background. */
  bgTint: string;
}

export const COLUMN_GROUPS: ColumnGroup[] = [
  { id: "rippo", label: "RIPPO",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    borderColor: "border-t-blue-400",
    bgTint: "bg-blue-50/50 dark:bg-blue-950/20" },
  { id: "engagement", label: "Engagement",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    borderColor: "border-t-purple-400",
    bgTint: "bg-purple-50/50 dark:bg-purple-950/20" },
  { id: "meetings", label: "Meetings",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    borderColor: "border-t-green-400",
    bgTint: "bg-green-50/50 dark:bg-green-950/20" },
  { id: "ri_programs", label: "RI Programs",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    borderColor: "border-t-orange-400",
    bgTint: "bg-orange-50/50 dark:bg-orange-950/20" },
  { id: "data_reporting", label: "Data & Reporting",
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    borderColor: "border-t-cyan-400",
    bgTint: "bg-cyan-50/50 dark:bg-cyan-950/20" },
  { id: "emr", label: "EMR",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    borderColor: "border-t-yellow-400",
    bgTint: "bg-yellow-50/50 dark:bg-yellow-950/20" },
  { id: "provider_tools", label: "Provider Tools",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    borderColor: "border-t-indigo-400",
    bgTint: "bg-indigo-50/50 dark:bg-indigo-950/20" },
  { id: "rating", label: "Rating & Notes",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    borderColor: "border-t-red-400",
    bgTint: "bg-red-50/50 dark:bg-red-950/20" },
];

// ---------------------------------------------------------------------------
// Shared option lists (reused across columns). Edit a list here and every
// column that references it updates automatically.
// ---------------------------------------------------------------------------

export const YES_NO = ["Yes", "No"];

export const TERRITORIES = [
  "Northeast", "Southeast", "Midwest", "Southwest", "West",
  "Mid-Atlantic", "South Central",
];

export const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export const RIPPO_NAMES = [
  "Jill Duhr","Amy Dunlavy","Abby Pierson","Jason Barnes","Jane Lynch",
  "Zackry Dougher","Janelle Foster","Matthew Wong","Jeneva Tobola","Leah Weiss",
  "Jennifer Butts","Pat Aramayo","Angela Czarnec","Priscilla Weightman",
  "Lara Brooks","Brianna Cunningham","Lisa Krause","Michael Torres",
  "Steven Juseck","Melissa Holly",
];

export const MEETING_FREQUENCIES = [
  "Fortnightly","Monthly","Quarterly","Biannually","Annually","Ad Hoc","TBD",
];

export const IOA_OPTIONS = [
  "Yes","No - in progress","No - they use another tool","No - declined","No - unengaged",
];

export const RISK_PROFICIENCY = ["High", "Medium", "Low"];

export const EMR_OPTIONS = [
  "Epic","Oracle (Cerner)","Allscripts","eCW","Athena","McKesson","AdvancedMD",
  "Meditech","Kareo","Greenway Health","Practice Fusion","NextGen Healthcare",
  "Modernizing Medicine","NexTech","TruBridge (CPSI)","Veradigm (Altera)","Other",
];

export const EPP_OPTIONS = [
  "Yes","No - setup with no payors","No - setup with non-Aetna payor(s) only",
];

export const EPP_TRANSITION = ["In discussions", "Declined"];

export const POC_OPTIONS = [
  "No","Yes - Arcadia","Yes - EPIC BPA","Yes - Vatica","Yes - Navina",
  "Yes - Azara (i2i)","Yes - Innovacer","Yes - MediVu","Yes - Reveleer",
  "Yes - Persivia","Yes - Other 3rd party","Yes - Custom/Home grown solution",
];

// ---------------------------------------------------------------------------
// The COLUMNS array — ONE ENTRY PER COLUMN. This is the file customers edit.
// ---------------------------------------------------------------------------

export type ColumnType = "text" | "date" | "select" | "comments";

export interface ColumnDef {
  /** Delta-table column name + API field name. Use snake_case. */
  key: string;
  /** Header shown in the grid. */
  label: string;
  /** Optional CSV export header (defaults to `label`). */
  csvLabel?: string;
  /** Tooltip text shown on hover over the header. */
  definition: string;
  /** Group id (see COLUMN_GROUPS). `null` = identity / always-visible. */
  group: string | null;
  /**
   * Identity columns are required on create and locked (read-only) afterward.
   * Editable columns are optional on create and editable at any time.
   */
  locked: boolean;
  /** Input widget used when editing / creating a row. */
  type: ColumnType;
  /** For type="select" — the dropdown option list. */
  options?: string[];
  /** Pixel width in the grid header. */
  width: number;
  /** Minimum pixel width. */
  minWidth: number;
}

export const COLUMNS: ColumnDef[] = [
  // --- Identity (locked after creation) ---
  { key: "territory", label: "Territory",
    definition: "Territory grouping",
    group: null, locked: true, type: "select", options: TERRITORIES,
    width: 120, minWidth: 90 },
  { key: "market_head", label: "Market Head",
    definition: "Matches to market head categories in current RAD (e.g. Keystone, Great Lakes)",
    group: null, locked: true, type: "text",
    width: 130, minWidth: 100 },
  { key: "state", label: "State",
    definition: "Matches to PBG state field in current RAD",
    group: null, locked: true, type: "select", options: STATES,
    width: 75, minWidth: 65 },
  { key: "pbg_number", label: "Provider Acct #",
    csvLabel: "Provider Acct #",
    definition: "Provider account # — often assigned to VBCs; for non-VBCs this is the Tax ID #",
    group: null, locked: true, type: "text",
    width: 140, minWidth: 110 },
  { key: "pbg_name", label: "Provider Name",
    definition: "Provider name — assigned at VBC level; for non-VBCs this is Tax ID Name",
    group: null, locked: true, type: "text",
    width: 220, minWidth: 160 },

  // --- RIPPO Assignments ---
  { key: "previously_managed_by", label: "Prev. Managed By",
    csvLabel: "Prev Managed By",
    definition: "Colleague in charge of PBG relationship at beginning of year",
    group: "rippo", locked: false, type: "select", options: RIPPO_NAMES,
    width: 170, minWidth: 150 },
  { key: "currently_managed_by", label: "Currently Managed By",
    definition: "Colleague in charge of PBG relationship now",
    group: "rippo", locked: false, type: "select", options: RIPPO_NAMES,
    width: 180, minWidth: 160 },

  // --- Engagement ---
  { key: "current_engaged", label: "Current Engaged?",
    csvLabel: "Current Engaged",
    definition: "Identifies their current engagement with RI team",
    group: "engagement", locked: false, type: "select", options: YES_NO,
    width: 130, minWidth: 110 },

  // --- Meetings ---
  { key: "latest_meeting", label: "Latest Meeting",
    definition: "Latest meeting in current calendar year",
    group: "meetings", locked: false, type: "date",
    width: 135, minWidth: 115 },
  { key: "meeting_frequency", label: "Frequency",
    csvLabel: "Meeting Frequency",
    definition: "How frequently are meetings scheduled",
    group: "meetings", locked: false, type: "select", options: MEETING_FREQUENCIES,
    width: 130, minWidth: 110 },

  // --- RI Programs ---
  { key: "ioa_participation", label: "IOA",
    csvLabel: "IOA Participation",
    definition: "Identifies if the provider is participating in Optum IOA program; if not, what is the current status",
    group: "ri_programs", locked: false, type: "select", options: IOA_OPTIONS,
    width: 200, minWidth: 180 },

  // --- Data & Reporting ---
  { key: "additional_reporting_requested", label: "Addl. Reporting?",
    csvLabel: "Addl Reporting Requested",
    definition: "Is the provider actively asking for additional reporting outside our standard reports?",
    group: "data_reporting", locked: false, type: "select", options: YES_NO,
    width: 140, minWidth: 120 },
  { key: "member_level_reporting", label: "Member Rpt?",
    csvLabel: "Member Level Reporting",
    definition: "Are we sharing member level reporting to the provider to support RI activity?",
    group: "data_reporting", locked: false, type: "select", options: YES_NO,
    width: 120, minWidth: 100 },
  { key: "gap_level_reporting", label: "Gap Rpt?",
    csvLabel: "Gap Level Reporting",
    definition: "Are we sharing gap level reporting to the provider to support RI activity?",
    group: "data_reporting", locked: false, type: "select", options: YES_NO,
    width: 110, minWidth: 90 },

  // --- EMR ---
  { key: "emr", label: "EMR",
    definition: "What EMR does the majority of Aetna membership use at this provider? Consider providers with multiple EMRs.",
    group: "emr", locked: false, type: "select", options: EMR_OPTIONS,
    width: 180, minWidth: 160 },
  { key: "epic_epp", label: "EPP?",
    csvLabel: "EPP",
    definition: "For providers on EPIC, do they have an EPP connection setup with Aetna, or only with other payors?",
    group: "emr", locked: false, type: "select", options: EPP_OPTIONS,
    width: 220, minWidth: 180 },
  { key: "epp_transition_status", label: "EPP Transition",
    definition: "If they aren't on EPP with Aetna today, what is the latest status in getting them there?",
    group: "emr", locked: false, type: "select", options: EPP_TRANSITION,
    width: 140, minWidth: 120 },

  // --- Provider Tools ---
  { key: "poc_solution", label: "POC Solution",
    definition: "Does the provider use another solution (in-house or vendor) that they find preferable to Optum IOA?",
    group: "provider_tools", locked: false, type: "select", options: POC_OPTIONS,
    width: 220, minWidth: 200 },

  // --- Rating & Notes ---
  { key: "ma_risk_proficiency", label: "MA Risk Prof.",
    csvLabel: "MA Risk Proficiency",
    definition: "Overall rating of provider's risk adjustment proficiency based on tools available and utilized for RI. High = direct engagement with vendors, EMR integration, coding staff. Medium = dedicated risk manager, decent IOA participation. Low = insufficient staff, poor engagement.",
    group: "rating", locked: false, type: "select", options: RISK_PROFICIENCY,
    width: 130, minWidth: 110 },
  { key: "comments", label: "Comments",
    definition: "Free text comments",
    group: "rating", locked: false, type: "comments",
    width: 220, minWidth: 170 },
];

// ---------------------------------------------------------------------------
// Derived helpers — computed from COLUMNS at import time. Don't hand-edit.
// ---------------------------------------------------------------------------

/** Column keys that are required on create and read-only afterward. */
export const IDENTITY_KEYS = COLUMNS.filter((c) => c.locked).map((c) => c.key);

/** Column keys editable after creation. */
export const EDITABLE_KEYS = COLUMNS.filter((c) => !c.locked).map((c) => c.key);

/** All data column keys, in display order. */
export const ALL_DATA_KEYS = COLUMNS.map((c) => c.key);

/** Tooltip text lookup: key → definition. */
export const COLUMN_DEFINITIONS: Record<string, string> = Object.fromEntries(
  COLUMNS.map((c) => [c.key, c.definition]),
);

/** Blank values for each column — used by the inline-add row form. */
export const EMPTY_FORM: Record<string, string> = Object.fromEntries(
  COLUMNS.map((c) => [c.key, ""]),
);

/** CSV export headers, in column order, plus system fields. */
export const CSV_HEADERS: string[] = [
  ...COLUMNS.map((c) => c.csvLabel ?? c.label),
  "Created By", "Created At", "Updated At",
];

/** Map of column key → dropdown options (only for type="select"). */
export const DROPDOWN_OPTIONS: Record<string, string[]> = Object.fromEntries(
  COLUMNS
    .filter((c) => c.type === "select" && c.options)
    .map((c) => [c.key, c.options!]),
);
