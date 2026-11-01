#!/usr/bin/env python3
"""Keep Comparator's sandbox and pass only bounded Lean worker settings.

Lean 4.35 Comparator clears these variables. Its 1 GiB default thread stacks
exhaust an 8 GB virtual-memory cap before any proof is checked.
Use COMPARATOR_BWRAP=$PWD/../scripts/lean-bwrap.py from lean/.
"""
import os
import sys

args = sys.argv[1:]
boundary = args.index("--")
args[boundary:boundary] = ["--setenv", "LEAN_NUM_THREADS", "6",
                          "--setenv", "LEAN_STACK_SIZE_KB", "65536"]
os.execvp("bwrap", ["bwrap", *args])
