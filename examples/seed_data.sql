-- Example seed data — 50 synthetic provider-group rows for the Medicaid
-- subset schema. Use this to populate a freshly-created backing table so
-- the app has something to render out of the gate.
--
-- Run once in the SQL editor after creating the table. Substitute your
-- <your_catalog> and <your_schema> with the real values from app.yaml.
--
-- All values are fake. Territories, market heads, and RIPPO names are
-- made-up strings that match the dropdown option shape; they aren't tied
-- to any real org.

INSERT INTO <your_catalog>.<your_schema>.provider_groups (
  id, territory, market_head, state, pbg_number, pbg_name,
  previously_managed_by, currently_managed_by, current_engaged,
  latest_meeting, meeting_frequency, ioa_participation,
  additional_reporting_requested, member_level_reporting, gap_level_reporting,
  emr, epic_epp, epp_transition_status,
  poc_solution, ma_risk_proficiency, comments,
  created_by, created_at, updated_at
)
SELECT
  uuid() AS id,
  element_at(array('Northeast','Southeast','Midwest','Southwest','West','Mid-Atlantic','South Central'), 1 + cast(rand()*7 AS INT)) AS territory,
  element_at(array('Keystone','Great Lakes','Pacific','Rio Grande','Sunbelt','Capital','Heartland'), 1 + cast(rand()*7 AS INT)) AS market_head,
  element_at(array('CA','TX','NY','FL','IL','OH','PA','GA','NC','MI','NJ','VA','WA','AZ','MA','TN','IN','MO','MD','WI'), 1 + cast(rand()*20 AS INT)) AS state,
  concat('PBG-', lpad(cast(1000 + i AS STRING), 5, '0')) AS pbg_number,
  concat(
    element_at(array('Acme','Horizon','Summit','Pioneer','Unity','Cascade','Meridian','Liberty','Vanguard','Coastal','Northstar','Keystone','Sierra','Aurora','Evergreen'), 1 + cast(rand()*15 AS INT)),
    ' ',
    element_at(array('Health','Medical Group','Physicians','Associates','Clinic','Care Partners','Medical Center','Family Medicine'), 1 + cast(rand()*8 AS INT))
  ) AS pbg_name,
  element_at(array('Jill Duhr','Amy Dunlavy','Abby Pierson','Jason Barnes','Jane Lynch','Zackry Dougher','Janelle Foster','Matthew Wong','Jeneva Tobola','Leah Weiss'), 1 + cast(rand()*10 AS INT)) AS previously_managed_by,
  element_at(array('Jennifer Butts','Pat Aramayo','Angela Czarnec','Priscilla Weightman','Lara Brooks','Brianna Cunningham','Lisa Krause','Michael Torres','Steven Juseck','Melissa Holly'), 1 + cast(rand()*10 AS INT)) AS currently_managed_by,
  element_at(array('Yes','No'), 1 + cast(rand()*2 AS INT)) AS current_engaged,
  cast(date_add(current_date(), -cast(rand()*200 AS INT)) AS STRING) AS latest_meeting,
  element_at(array('Fortnightly','Monthly','Quarterly','Biannually','Annually','Ad Hoc','TBD'), 1 + cast(rand()*7 AS INT)) AS meeting_frequency,
  element_at(array('Yes','No - in progress','No - they use another tool','No - declined','No - unengaged'), 1 + cast(rand()*5 AS INT)) AS ioa_participation,
  element_at(array('Yes','No'), 1 + cast(rand()*2 AS INT)) AS additional_reporting_requested,
  element_at(array('Yes','No'), 1 + cast(rand()*2 AS INT)) AS member_level_reporting,
  element_at(array('Yes','No'), 1 + cast(rand()*2 AS INT)) AS gap_level_reporting,
  element_at(array('Epic','Oracle (Cerner)','Allscripts','eCW','Athena','NextGen Healthcare','Greenway Health','Other'), 1 + cast(rand()*8 AS INT)) AS emr,
  element_at(array('Yes','No - setup with no payors','No - setup with non-Aetna payor(s) only'), 1 + cast(rand()*3 AS INT)) AS epic_epp,
  element_at(array('In discussions','Declined'), 1 + cast(rand()*2 AS INT)) AS epp_transition_status,
  element_at(array('No','Yes - Arcadia','Yes - EPIC BPA','Yes - Vatica','Yes - Navina','Yes - Innovacer'), 1 + cast(rand()*6 AS INT)) AS poc_solution,
  element_at(array('High','Medium','Low'), 1 + cast(rand()*3 AS INT)) AS ma_risk_proficiency,
  NULL AS comments,
  'seed@example.com' AS created_by,
  current_timestamp() AS created_at,
  current_timestamp() AS updated_at
FROM (SELECT explode(sequence(1, 50)) AS i);
