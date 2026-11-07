-- Evidence is required only for screens since the last successful command.
ALTER TABLE commit_sessions ADD COLUMN screen_start integer NOT NULL DEFAULT 0;

-- Rendering data travels with the native interaction cache, never browser input.
ALTER TABLE commit_sessions ADD COLUMN native_display jsonb;
