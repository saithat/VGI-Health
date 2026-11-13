-- Signing deficiencies and order reconciliation at transfer and discharge.
-- Checkpoints record the patient's ADT revision and encounter context when
-- saved, and keep discarded inpatient order drafts in provenance after discharge.
ALTER TABLE commit_draft_checkpoints
  ADD COLUMN patient text,
  ADD COLUMN encounter_id text,
  ADD COLUMN encounter_kind text,
  ADD COLUMN adt_revision integer NOT NULL DEFAULT 0,
  ADD COLUMN saved_at_minute integer,
  ADD COLUMN superseded boolean NOT NULL DEFAULT false,
  ADD COLUMN discarded_at_discharge boolean NOT NULL DEFAULT false,
  ADD COLUMN discarded_captures jsonb;

CREATE INDEX commit_draft_checkpoints_actor_idx
  ON commit_draft_checkpoints (tenant, actor, auth_session);
