-- Departure snapshots outlive the short-lived command session. Application
-- code inserts/selects these immutable rows; source sessions are provenance,
-- not foreign keys or live dependencies. Access requires the same login scope.
CREATE TABLE commit_draft_checkpoints (
  tenant text NOT NULL,
  id uuid NOT NULL,
  actor text NOT NULL,
  auth_session text NOT NULL,
  release_hash text NOT NULL,
  source_session uuid NOT NULL,
  source_revision integer NOT NULL,
  leave_hash text NOT NULL,
  workspace_state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant, id),
  UNIQUE (tenant, actor, auth_session, source_session, source_revision, leave_hash)
);
