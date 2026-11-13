-- Signing deficiencies and order reconciliation at transfer and discharge.
-- Each checkpoint records, per stored patient draft, the patient's ADT stamp
-- (revision, admission ordinal, admitted) from the chart it was saved from.
ALTER TABLE commit_draft_checkpoints ADD COLUMN draft_adt jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Unsigned inpatient order lines a discharge kept out of a reopened chart.
-- Immutable provenance for their author; the source checkpoint is unchanged.
CREATE TABLE commit_discarded_drafts (
  tenant text NOT NULL,
  checkpoint_id uuid NOT NULL,
  patient text NOT NULL,
  actor text NOT NULL,
  encounter_id text NOT NULL DEFAULT '',
  captured jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant, checkpoint_id, patient)
);
CREATE INDEX commit_discarded_drafts_actor ON commit_discarded_drafts (tenant, actor);

-- A computed deficiency list as served to one login. A chart session binds the
-- list by ID, so its native replay paints the same work-list activity.
CREATE TABLE commit_deficiency_lists (
  tenant text NOT NULL,
  id uuid NOT NULL,
  actor text NOT NULL,
  auth_session text NOT NULL,
  activity jsonb NOT NULL,
  deficiencies jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant, id)
);
