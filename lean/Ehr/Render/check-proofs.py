#!/usr/bin/env python3
"""Build, export and Comparator-check every render theorem with frozen signatures.

The temporary challenge replaces proofs with holes, as Comparator expects.
No challenge holes are written into repository source or finished proofs.
"""
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[3]
LEAN = ROOT / 'lean'
AUDIT = ROOT / '.tools/render-proof-audit'
GROUPS = {
    'Proofs': ('Ehr.Render', ['T10_shown', 'T10_no_tiny', 'T10_page_safe', 'T10_disabled', 'T10_only_shown', 'T10_info']),
    'CommitProofs': ('Ehr.Render', ['T10_commit_enabled']),
    'FhirProofs': ('Ehr.Render.Fhir', ['T11_allergy', 'T11_med', 'T5_weight', 'T5_allergyVersion', 'T5_version_order_independent']),
    'PanelProofs': ('Ehr.Render', ['T11_allergy_fhir_page', 'T11_med_fhir_page']),
    'PrefillProofs': ('Ehr.Render', ['T11_pending_prefill']),
}

def run(args, **kwargs):
    subprocess.run(list(map(str, args)), check=True, cwd=LEAN, **kwargs)


def main():
    AUDIT.mkdir(parents=True, exist_ok=True)
    challenge = ['import Ehr.Render.Contracts', 'import Ehr.Render.Fhir', 'open Lean Ehr']
    names = []
    for file, (namespace, theorems) in GROUPS.items():
        source = (LEAN / 'Ehr/Render' / (file + '.lean')).read_text()
        challenge.append('namespace ' + namespace)
        for name in theorems:
            match = re.search(r'\btheorem ' + re.escape(name) + r'\b', source)
            if not match:
                raise RuntimeError('missing theorem ' + name)
            start = match.start()
            end = source.index(':=', start)
            challenge.append(source[start:end] + ':= by sorry')
            names.append(namespace + '.' + name)
        challenge.append('end ' + namespace)
    (AUDIT / 'RenderStatements.lean').write_text('\n\n'.join(challenge) + '\n')
    config = dict(challenge_module='RenderStatements', solution_module='Ehr.Render',
                  theorem_names=names, permitted_axioms=['propext', 'Quot.sound', 'Classical.choice'])
    (AUDIT / 'comparator.json').write_text(json.dumps(config, indent=2) + '\n')
    run(['lake', 'build', 'Ehr.Render'])
    prefix = Path(subprocess.check_output(['lean', '--print-prefix'], cwd=LEAN, text=True).strip())
    env = dict(os.environ, LEAN_PATH=os.pathsep.join(map(str, [AUDIT, LEAN / '.lake/build/lib/lean'])))
    subprocess.run([prefix / 'bin/lean', '-o', AUDIT / 'RenderStatements.olean', AUDIT / 'RenderStatements.lean'],
                   check=True, cwd=AUDIT, env=env)
    for module, file in [('RenderStatements', 'challenge.ndjson'), ('Ehr.Render', 'solution.ndjson')]:
        with (AUDIT / file).open('w') as output:
            subprocess.run([prefix / 'bin/leanexport', module],
                           stdout=output, check=True, cwd=AUDIT, env=env)
    run(['lake', 'comparator', '--config', AUDIT / 'comparator.json',
         '--challenge-from-export', AUDIT / 'challenge.ndjson',
         '--solution-from-export', AUDIT / 'solution.ndjson'])

if __name__ == '__main__':
    main()
