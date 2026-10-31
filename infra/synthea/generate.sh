#!/usr/bin/env bash
# Generate the raw Synthea population for VGI Health (FHIR R4 transaction bundles).
#
#   infra/synthea/generate.sh            # all cohorts -> fixtures/raw/<cohort>/fhir/*.json
#   COHORTS="peds" infra/synthea/generate.sh   # regenerate a subset
#
# Downloads a pinned synthea-with-dependencies.jar into .tools/ (gitignored, sha256-checked).
# Every cohort has a fixed seed, clinician seed, and reference/end date, and Synthea runs
# single-threaded (multi-threaded runs with keep modules are not byte-for-byte reproducible),
# so output is reproducible. Raw output is gitignored; run `node infra/synthea/trim.mjs` afterwards
# (or `make synthea`, which does both) to rebuild the committed fixtures/synthea/.
#
# Needs Java 17+ (tested with OpenJDK 25).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HERE="$ROOT/infra/synthea"

SYNTHEA_VERSION="v4.0.0"
SYNTHEA_SHA256="ed43c20ad40ba5c3bc724503a5af032715fe3c491620b766148e7c2361e6ecc1"
SYNTHEA_URL="https://github.com/synthetichealth/synthea/releases/download/${SYNTHEA_VERSION}/synthea-with-dependencies.jar"
JAR_DIR="$ROOT/.tools/synthea-${SYNTHEA_VERSION}"
JAR="$JAR_DIR/synthea-with-dependencies.jar"

OUT="$ROOT/fixtures/raw"
# Fixed "today" for the simulation so reruns are byte-for-byte reproducible.
REF_DATE="${REF_DATE:-20261031}"
YEARS_OF_HISTORY="${YEARS_OF_HISTORY:-10}"
STATE="Massachusetts"

# Columns: name | seed | population (alive) | age range | keep module in infra/synthea/keep/ (- = none)
#          | years of history (0 = full lifetime)
# The surgical cohort uses full history: Synthea's keep check matches an appendectomy or
# cholecystectomy at any age, and with a 10-year window most of those operations fall outside
# the export. trim.mjs keeps surgical procedures (and their encounters) regardless of date.
COHORT_TABLE="
adults         1001 80 25-85 -                   $YEARS_OF_HISTORY
hyperlipidemia 1201 10 40-85 hyperlipidemia.json $YEARS_OF_HISTORY
allergy        2001 12 18-85 drug_allergy.json   $YEARS_OF_HISTORY
anticoag       3001 10 55-90 anticoagulant.json  $YEARS_OF_HISTORY
surgical       4001 12 18-75 surgical.json       0
peds           5001 46 0-17  -                   $YEARS_OF_HISTORY
peds_allergy   5101  4 2-17  drug_allergy.json   $YEARS_OF_HISTORY
"
COHORTS="${COHORTS:-adults hyperlipidemia allergy anticoag surgical peds peds_allergy}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "error: '$1' is required" >&2; exit 1; }; }
need java
need curl
need sha256sum

java_major="$(java -XshowSettings:properties -version 2>&1 | awk -F'= ' '/java.specification.version/ {print $2}' | cut -d. -f1)"
if [ -z "$java_major" ] || [ "$java_major" -lt 17 ]; then
  echo "error: Java 17+ required (found: ${java_major:-unknown})" >&2
  exit 1
fi

fetch_jar() {
  if [ -f "$JAR" ] && echo "$SYNTHEA_SHA256  $JAR" | sha256sum -c --status; then
    return
  fi
  echo "Downloading Synthea ${SYNTHEA_VERSION} (~200 MB) -> $JAR"
  mkdir -p "$JAR_DIR"
  curl -fL --retry 3 -o "$JAR.part" "$SYNTHEA_URL"
  if ! echo "$SYNTHEA_SHA256  $JAR.part" | sha256sum -c --status; then
    echo "error: sha256 mismatch for $SYNTHEA_URL" >&2
    rm -f "$JAR.part"
    exit 1
  fi
  mv "$JAR.part" "$JAR"
}

run_cohort() {
  local name="$1" seed="$2" pop="$3" ages="$4" keep="$5" years="$6"
  local dir="$OUT/$name"
  local keep_args=()
  if [ "$keep" != "-" ]; then
    keep_args=(-k "$HERE/keep/$keep")
  fi
  echo "== cohort $name: seed=$seed population=$pop ages=$ages keep=$keep years_of_history=$years"
  rm -rf "$dir"
  mkdir -p "$dir"
  # Synthea writes a few scratch files relative to the working directory; keep them in $dir.
  (
    cd "$dir"
    java -jar "$JAR" \
      -s "$seed" -cs "$seed" -r "$REF_DATE" -e "$REF_DATE" \
      -p "$pop" -a "$ages" "${keep_args[@]}" \
      --exporter.baseDirectory="$dir/" \
      --exporter.years_of_history="$years" \
      --exporter.fhir.export=true \
      --exporter.fhir.transaction_bundle=true \
      --exporter.hospital.fhir.export=true \
      --exporter.practitioner.fhir.export=true \
      --exporter.clinical_note.export=true \
      --exporter.csv.export=false \
      --generate.only_alive_patients=true \
      --generate.append_numbers_to_person_names=false \
      --generate.thread_pool_size=1 \
      "$STATE"
  ) >"$dir/synthea.log" 2>&1 || { echo "error: Synthea failed for $name; see $dir/synthea.log" >&2; tail -20 "$dir/synthea.log" >&2; exit 1; }
  grep -E '^Records:' "$dir/synthea.log" || true
  echo "   $(find "$dir/fhir" -name '*.json' ! -name 'hospitalInformation*' ! -name 'practitionerInformation*' | wc -l) patient bundles, $(du -sh "$dir/fhir" | cut -f1)"
}

fetch_jar
mkdir -p "$OUT"
for want in $COHORTS; do
  line="$(echo "$COHORT_TABLE" | awk -v n="$want" '$1 == n')"
  if [ -z "$line" ]; then
    echo "error: unknown cohort '$want'" >&2
    exit 1
  fi
  # shellcheck disable=SC2086
  run_cohort $line
done
echo "Raw Synthea output in $OUT (gitignored). Next: node infra/synthea/trim.mjs"
