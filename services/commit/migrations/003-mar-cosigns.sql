-- Version-scoped consent from an independently authenticated second RN.
CREATE TABLE commit_mar_cosigns (
  tenant text NOT NULL,
  patient text NOT NULL,
  release_name text NOT NULL,
  workflow text NOT NULL,
  patient_version integer NOT NULL CHECK(patient_version >= 1),
  signer text NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY(tenant,patient,release_name,workflow,patient_version,signer)
);
