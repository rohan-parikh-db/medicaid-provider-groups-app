-- Creates the backing Delta table for the app. Run once per deployment in
-- the SQL editor. Substitute your <your_catalog> and <your_schema>.
--
-- The column list here MUST match the `COLUMNS` array in shared/columns.ts.
-- When you add / remove / rename a column in shared/columns.ts, run the
-- corresponding ALTER TABLE statement against this table.

CREATE TABLE IF NOT EXISTS <your_catalog>.<your_schema>.provider_groups (
  id STRING NOT NULL,

  -- Identity / locked-after-creation
  territory STRING    COMMENT 'Territory grouping',
  market_head STRING  COMMENT 'Matches to market head categories in current RAD (e.g. Keystone, Great Lakes)',
  state STRING        COMMENT 'US state the provider operates in',
  pbg_number STRING   COMMENT 'Provider account # — often assigned to VBCs; for non-VBCs this is the Tax ID #',
  pbg_name STRING     COMMENT 'Provider name — assigned at VBC level; for non-VBCs this is Tax ID Name',

  -- RIPPO Assignments
  previously_managed_by STRING COMMENT 'Colleague in charge of PBG relationship at beginning of year',
  currently_managed_by STRING  COMMENT 'Colleague in charge of PBG relationship now',

  -- Engagement
  current_engaged STRING       COMMENT 'Identifies their current engagement with RI team',

  -- Meetings
  latest_meeting STRING        COMMENT 'Latest meeting in current calendar year (YYYY-MM-DD)',
  meeting_frequency STRING     COMMENT 'How frequently are meetings scheduled',

  -- RI Programs
  ioa_participation STRING     COMMENT 'Identifies if the provider is participating in Optum IOA program; if not, what is the current status',

  -- Data & Reporting
  additional_reporting_requested STRING COMMENT 'Is the provider actively asking for additional reporting outside our standard reports?',
  member_level_reporting STRING         COMMENT 'Are we sharing member level reporting to the provider to support RI activity?',
  gap_level_reporting STRING            COMMENT 'Are we sharing gap level reporting to the provider to support RI activity?',

  -- EMR
  emr STRING                            COMMENT 'What EMR does the majority of membership use at this provider?',
  epic_epp STRING                       COMMENT 'For providers on EPIC, do they have an EPP connection setup?',
  epp_transition_status STRING          COMMENT 'If not on EPP today, what is the latest status in getting them there?',

  -- Provider Tools
  poc_solution STRING                   COMMENT 'Does the provider use another solution preferred to Optum IOA?',

  -- Rating & Notes
  ma_risk_proficiency STRING            COMMENT 'Overall rating of provider''s risk adjustment proficiency (High/Medium/Low)',
  comments STRING                       COMMENT 'Free text comments',

  -- System-managed
  created_by STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
USING DELTA
COMMENT 'Backing table for the Medicaid Provider Groups app (see github.com/rohan-parikh-db/medicaid-provider-groups-app)';
