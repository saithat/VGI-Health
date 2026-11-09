#!/usr/bin/env python3
"""Read-only export of encounter labels, chart sections and imaging priorities.

The pinned release DB is opened read-only. Board-question text, LLM logs and
terminology tables are not exported; chart sections are the released
encounter_ehr_sections rows (synthetic, redistributable)."""
import json
import sqlite3
import sys
from pathlib import Path

connection = sqlite3.connect(Path(sys.argv[1]).resolve().as_uri() + '?mode=ro', uri=True)
connection.row_factory = sqlite3.Row
codes = {row['diagnosis_id']: row['icd10_code'] for row in connection.execute('SELECT diagnosis_id, icd10_code FROM diagnoses')}
labels = {}
for row in connection.execute("SELECT ground_truth FROM benchmark_ground_truth WHERE task='patient_diagnosis' ORDER BY gt_id"):
    truth = json.loads(row['ground_truth'])
    for encounter, entries in (truth.get('encounter_diagnosis_map') or {}).items():
        correct = [e for e in entries if isinstance(e, dict) and e.get('role') == 'correct']
        if len(correct) == 1:
            labels[int(encounter)] = codes.get(correct[0]['diagnosis_id'])
patients = {row['patient_id']: {'age': row['age'], 'sex': row['sex']} for row in connection.execute(
    'SELECT patient_id, age, sex FROM longitudinal_patients ORDER BY patient_id')}
encounters = [{
    'id': row['encounter_id'], 'patient': row['patient_id'], 'date': row['encounter_date'],
    'type': row['encounter_type'], 'department': row['department'], 'attending': row['attending_name'],
    'icd10': labels.get(row['encounter_id']), 'noteChars': len(row['note_text'] or ''),
} for row in connection.execute('SELECT * FROM longitudinal_encounters ORDER BY encounter_id')]
sections = [[row['encounter_id'], row['section_type'], row['section_order'], row['section_text']]
            for row in connection.execute('SELECT encounter_id, section_type, section_order, section_text FROM encounter_ehr_sections ORDER BY encounter_id, section_order, id')]
imaging = [[row['encounter_id'], row['order_priority'], row['modality']]
           for row in connection.execute('SELECT encounter_id, order_priority, modality FROM imaging_orders ORDER BY order_id')]
print(json.dumps({'patients': patients, 'encounters': encounters, 'sections': sections, 'imaging': imaging}))
