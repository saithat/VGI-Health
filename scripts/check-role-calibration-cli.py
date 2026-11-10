#!/usr/bin/env python3
"""Check opt-in native CLI controls on the frozen training input, never a holdout."""
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def main():
    i = json.loads((ROOT/'runs/wave3-fit/inputs/manifest.json').read_text())['U8-2']
    base = [str(ROOT/'lean/.lake/build/bin/ehr'),'simulate',
            '--spec',i['spec'],'--program',i['program'],'--persona',i['persona'],
            '--schedule',i['schedule'],'--world',i['world'],
            '--clock-mode','continuous','--interruptions','realWork',
            '--sim-model','wave3','--text-cost','length']

    def run(*flags):
        p = subprocess.run(base+list(flags),capture_output=True,text=True,check=True,timeout=120)
        return p.stdout, json.loads(p.stdout)

    a, control = run('--seed','7')
    b, _ = run('--seed','7','--choice-latency-ms','0')
    assert a == b, 'explicit zero must preserve the default byte-for-byte'
    _, delayed = run('--seed','7','--choice-latency-ms','1000')
    assert delayed['workload']['timings'][0]['clocks']['uiMs'] > control['workload']['timings'][0]['clocks']['uiMs']
    _, x = run('--seed','1','--arrival-seed','17')
    _, y = run('--seed','99','--arrival-seed','17')
    offered = lambda d: [t['interruptions']['offered'] for t in d['tasks']]
    assert offered(x) == offered(y), 'offered work must be independent of behavioral seed'
    for flag in ['--choice-latency-ms','--arrival-seed']:
        p = subprocess.run(base+['--seed','7',flag,'-1'],capture_output=True,text=True,timeout=120)
        assert p.returncode == 1 and 'natural number' in p.stderr
    print('PASS native CLI: default=zero; positive choice service; independent offers; negative controls rejected')


if __name__ == '__main__':
    main()
