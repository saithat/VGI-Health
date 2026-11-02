"""Standalone reliability curves from frozen-model labeled decision evaluations."""
import json
import sys
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
source = Path(sys.argv[1])
data = json.loads(source.read_text())
fig, axes = plt.subplots(1, 2, figsize=(9, 4), layout='constrained')
for ax, name in zip(axes, ('screen', 'choice')):
    rows = [b for b in data[name]['curve'] if b['n']]
    ax.plot([0, 1], [0, 1], '--', color='gray', label='ideal')
    ax.scatter([r['confidence'] for r in rows], [r['frequency'] for r in rows],
               s=[20 + 3 * r['n'] for r in rows], label='observed bins')
    ece = data[name]['ece']
    ax.set(title=f"{name}: n={data[name]['n']}, ECE={ece:.3f}" if ece is not None else name,
           xlabel='Predicted confidence / pass probability', ylabel='Observed frequency', xlim=(0, 1), ylim=(0, 1))
    ax.legend()
fig.suptitle(f"{data['model']} — simulator choices / Lean verdicts; smoke sample")
fig.savefig(source.with_suffix('.png'), dpi=160)
