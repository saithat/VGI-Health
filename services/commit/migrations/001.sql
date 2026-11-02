-- The application role must be the sole online writer. No external FHIR writes.
CREATE TABLE IF NOT EXISTS commit_streams (
  tenant text NOT NULL,
  key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('patient', 'dose', 'bed')),
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  snapshot jsonb NOT NULL,
  PRIMARY KEY (tenant, key)
);
CREATE TABLE IF NOT EXISTS commit_sessions (
  tenant text NOT NULL,
  id uuid NOT NULL,
  actor text NOT NULL,
  patient text NOT NULL,
  release_hash text NOT NULL,
  release_name text NOT NULL,
  workflow text NOT NULL,
  base_version integer NOT NULL,
  revision integer NOT NULL DEFAULT 0,
  context jsonb NOT NULL,
  events jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant, id)
);
CREATE TABLE IF NOT EXISTS commit_requests (
  tenant text NOT NULL,
  actor text NOT NULL,
  request_id text NOT NULL,
  payload_hash text NOT NULL,
  outcome jsonb,
  PRIMARY KEY (tenant, actor, request_id)
);
CREATE TABLE IF NOT EXISTS commit_events (
  tenant text NOT NULL,
  stream text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  transaction_id uuid NOT NULL,
  event jsonb NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant, stream, version),
  FOREIGN KEY (tenant, stream) REFERENCES commit_streams (tenant, key)
);
CREATE INDEX IF NOT EXISTS commit_events_transaction ON commit_events (transaction_id);
-- Application updates snapshots while holding stream row locks, then appends
-- every touched stream event and the request outcome in the same transaction.

CREATE UNIQUE INDEX IF NOT EXISTS commit_patient_model_id ON commit_streams (tenant, ((snapshot->>'modelId')::bigint)) WHERE kind = 'patient';
