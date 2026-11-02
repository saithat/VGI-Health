"""Export standalone, explicitly labeled reliability figures from study report JSON."""
import json
import os
import sys
from pathlib import Path

os.umask(0o077)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

source = Path(sys.argv[1])
data = json.loads(source.read_text())
fig, axes = plt.subplots(1, 2, figsize=(10, 4.7), layout="constrained")
for ax, key, title in zip(axes, ("decisionModel", "simulator"), ("Decision model", "Simulator profile mixture")):
    result = data["calibration"]["models"][key]
    bins = [b for b in result["curve"] if b["n"]]
    ax.plot([0, 1], [0, 1], "--", color="0.6", label="Ideal agreement")
    if bins:
        x, y = [b["confidence"] for b in bins], [b["frequency"] for b in bins]
        ax.plot(x, y, color="#16708a", alpha=0.6)
        ax.scatter(x, y, s=[25 + 3 * b["n"] for b in bins], color="#16708a", label="Observed bins (area scales with n)")
        for b in bins:
            ax.annotate(f"n={b['n']}", (b["confidence"], b["frequency"]), xytext=(5, 7), textcoords="offset points", fontsize=8)
        subtitle = f"n={result['n']}; ECE={result['ece']:.3f}; top-1={result['top1']:.3f}"
    else:
        subtitle = "No eligible scored observations"
    ax.set(title=f"{title}\n{subtitle}", xlabel="Predicted top-choice confidence", ylabel="Observed agreement frequency", xlim=(-0.02, 1.02), ylim=(-0.04, 1.04))
    ax.set_aspect("equal")
    ax.grid(alpha=0.15)
    ax.legend(fontsize=7, loc="upper left")
fig.suptitle(f"{data['provenance']} · top-label reliability\n{data['predictionProvenance']}", fontsize=10)
fig.savefig(source.parent / "reliability.svg")
fig.savefig(source.parent / "reliability.png", dpi=160)
plt.close(fig)
