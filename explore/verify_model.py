"""License preflight for explicitly selected open checkpoints; no inference."""
import json
import sys
from huggingface_hub import model_info
info = model_info(sys.argv[1], revision=sys.argv[2])
license_id = (info.card_data or {}).get('license')
if license_id not in ('apache-2.0', 'mit'):
    raise SystemExit(f'Unapproved model license: {license_id}')
print(json.dumps({'model': sys.argv[1], 'revision': info.sha, 'license': license_id}))
