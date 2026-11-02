-- Earlier consent cannot authorize a changed release under the same name.
ALTER TABLE commit_mar_cosigns ADD COLUMN release_hash text NOT NULL DEFAULT '';
