#!/usr/bin/env python3
"""Read-only export of released diagnosis codes; no terminology download or inference."""
import json
import sqlite3
import sys
from pathlib import Path

connection = sqlite3.connect(Path(sys.argv[1]).resolve().as_uri() + '?mode=ro', uri=True)
connection.row_factory = sqlite3.Row
tables = [row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
counts = {table: connection.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0] for table in tables}
diagnoses = [dict(row) for row in connection.execute(
    'SELECT diagnosis_id, display_name, icd10_code, icd10_desc, snomed_id FROM diagnoses ORDER BY diagnosis_id')]
# Longitudinal ground truth links a named diagnosis to the patient and first encounter.
# Only the diagnosis task's longitudinal objects are read; no questions or passages exported.
patients = {}
for row in connection.execute("SELECT patient_id, ground_truth FROM benchmark_ground_truth WHERE task='patient_diagnosis' ORDER BY gt_id"):
    truth = json.loads(row['ground_truth'])
    if not isinstance(truth, dict):
        continue
    for field in ('active_diagnoses', 'chronic_conditions'):
        for diagnosis in truth.get(field, []):
            if isinstance(diagnosis, dict) and diagnosis.get('display_name'):
                patients.setdefault(str(row['patient_id']), []).append(diagnosis)
print(json.dumps({'tableCounts': counts, 'diagnoses': diagnoses, 'patients': patients}))
