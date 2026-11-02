#!/usr/bin/env python3
"""Split exported states without changing indexes or dropping scan probes."""
import json
from pathlib import Path
import sys

for directory in map(Path, sys.argv[1:]):
    with (directory / 'states.json').open() as source:
        states = json.load(source)
    probes = [case for case in states if case[0].endswith('-expanded')]
    for shard in range(4):
        indexes = list(range(shard, len(states), 4))
        data = dict(total=len(states), shardIndex=shard, shardCount=4,
                    stateIndices=indexes, states=[states[i] for i in indexes],
                    scanStates=probes)
        with (directory / f'shard-{shard}.json').open('w') as output:
            json.dump(data, output, separators=(',', ':'))
    print(f'{directory}: all {len(states)} original indexes split across four shards; '
          f'all {len(probes)} expanded scan probes retained in each')
