-- Equal server timestamps must not let random UUID order select an older draft.
-- Preserve the previous order for historical rows; future saves receive a
-- database-owned sequence independent of wall-clock precision or clock changes.
ALTER TABLE commit_draft_checkpoints ADD COLUMN checkpoint_order bigserial NOT NULL;
WITH ordered AS (
  SELECT tenant, id, row_number() OVER (ORDER BY created_at, id, tenant) AS ordinal
  FROM commit_draft_checkpoints
)
UPDATE commit_draft_checkpoints AS checkpoint SET checkpoint_order = ordered.ordinal
FROM ordered WHERE checkpoint.tenant = ordered.tenant AND checkpoint.id = ordered.id;
SELECT setval(pg_get_serial_sequence('commit_draft_checkpoints', 'checkpoint_order'),
  COALESCE((SELECT max(checkpoint_order) + 1 FROM commit_draft_checkpoints), 1), false);
CREATE UNIQUE INDEX commit_draft_checkpoint_order ON commit_draft_checkpoints(checkpoint_order);
CREATE INDEX commit_draft_latest ON commit_draft_checkpoints(tenant, actor, auth_session, checkpoint_order DESC);
