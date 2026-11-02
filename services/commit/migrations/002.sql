-- Retain the patient binding with outcomes so scope revocation applies even
-- when the original session has expired. Null historical outcomes fail closed.
ALTER TABLE commit_requests ADD COLUMN patient text;
