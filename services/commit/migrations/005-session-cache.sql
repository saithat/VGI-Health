-- Native-only cache, written by the server after replaying human interactions.
-- A patient version change invalidates it; final commands always re-run the
-- native guard on the locked current snapshot. No HTTP input accepts this state.
ALTER TABLE commit_sessions ADD COLUMN native_state jsonb;
ALTER TABLE commit_sessions ADD COLUMN native_facts jsonb;
ALTER TABLE commit_sessions ADD COLUMN native_version integer;
