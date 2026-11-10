#!/usr/bin/env python3
"""Frozen public-aggregate fit over the actual native wave-3 simulator.

Only aggregate reports may be committed; native inputs, attempts and traces go
under runs/. No human subjects are reconstructed from published moments.
"""
import argparse
import concurrent.futures
import hashlib
import json
import math
import os
from pathlib import Path
import random
import statistics
import subprocess
import zlib

ROOT = Path(__file__).resolve().parents[1]
METHOD = ROOT / 'docs/methods/role-calibration'
PREDECLARATION = 'ba5655a2e0e3b17692ac8fcadff1f5295f879483'


def read(path):
    return json.loads(Path(path).read_text())


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def wilson(successes, count, z=1.959964):
    if count <= 0 or not 0 <= successes <= count:
        raise ValueError('invalid source completion counts')
    p, zz = successes / count, z * z
    middle = (p + zz / (2 * count)) / (1 + zz / count)
    half = z * math.sqrt(p * (1-p) / count + zz / (4*count*count)) / (1 + zz/count)
    return [max(0, middle-half), min(1, middle+half)]


def summarize(rows):
    successes = [r for r in rows if r['completed']]
    times = [r['taskMs'] / 1000 for r in successes]
    return {
        'attempts': len(rows), 'successes': len(successes),
        'completion': len(successes) / len(rows) if rows else None,
        'meanSeconds': statistics.mean(times) if times else None,
        'sdSeconds': statistics.stdev(times) if len(times) > 1 else None,
        'meanSESeconds': statistics.stdev(times)/math.sqrt(len(times)) if len(times) > 1 else None,
        'meanClicks': statistics.mean(r['clicks'] for r in successes) if successes else None,
        'meanMentalOps': statistics.mean(r['mentalOps'] for r in successes) if successes else None,
        'meanClocksMs': {k: statistics.mean(r['clocks'][k] for r in rows)
                         for k in rows[0]['clocks']} if rows and rows[0]['clocks'] else None,
        'complaints': sorted({c.split(': ', 1)[-1] for r in rows for c in r['complaints']}),
        'offeredDigest': hashlib.sha256(json.dumps([r['interruptions']['offered'] for r in rows],
                                                  sort_keys=True).encode()).hexdigest() if rows else None,
    }


def assess(target, result, gate, source_matched=False):
    n = target['participants_n']
    interval = wilson(round(n * target['success_pct'] / 100), n, gate['wilsonZ'])
    mean = result.get('meanSeconds') if result else None
    sd = result.get('sdSeconds') if result else None
    completion = result.get('completion') if result else None
    se = result.get('meanSESeconds') if result else None
    checks = {
        'mean': mean is not None and abs(mean-target['time_mean_s']) <= target['time_sd_s'] * gate['maxMeanErrorSourceSD'],
        'sd': sd is not None and gate['sdRatio'][0] <= sd/target['time_sd_s'] <= gate['sdRatio'][1],
        'completion': completion is not None and interval[0]-1e-12 <= completion <= interval[1]+1e-12,
        'monteCarloSE': se is not None and se <= gate['maxMonteCarloSESourceSD'] * target['time_sd_s'],
        'sourceMatched': source_matched,
    }
    return {'targetMeanSeconds': target['time_mean_s'], 'targetSDSeconds': target['time_sd_s'],
            'wilson95': interval, 'checks': checks, 'pass': all(checks.values()),
            'path': 'excluded: unknown absolute denominator or aggregation; U9-2 printed 5/8 retained'}


def macro_mae(rows, arm):
    errors = [abs(r[arm]['meanSeconds']-r['assessment']['targetMeanSeconds']) for r in rows
              if r.get(arm) and r[arm]['meanSeconds'] is not None]
    return statistics.mean(errors) if errors else None


class Experiment:
    def __init__(self, out, source):
        self.out, self.source = out, source
        self.protocol, self.scripts = read(METHOD/'protocol.json'), read(METHOD/'scripts.json')
        self.targets = {r['id']: r for r in read(ROOT/'docs/design/workflow-sources/usability-tasks.json')['rows']}
        self.binary = ROOT/'lean/.lake/build/bin/role-calibration'
        self.world = source/'runs/world/wave3-sim-smoke'
        self.inputs = {}

    def prepare(self):
        if not self.binary.is_file():
            raise ValueError('build native role-calibration in this worktree first')
        if not self.world.is_dir():
            raise ValueError('merged wave-3 source world missing: '+str(self.world))
        for script in self.scripts['scripts']:
            if not script['execute']:
                continue
            persona = 'P1' if script['profile'] == 'pcp' else 'P2'
            # Fix source patient before seeing any fitted output: first W1/W3
            # patient on day 2. Preserve its actual wave-3 chart and note lengths.
            source_day = read(self.world/f'day-2-{persona}.json')
            patient = next(t['patientId'] for t in source_day['tasks'] if t['workflow'] == script['workflow'])
            program = read(ROOT/f'releases/v2/personas/{persona}.json')
            program['patientSelection'] = False
            program['start'] = 'chartSummary'
            params = read(self.world/f'personas/{persona}.json')
            params.update(reviewsAllergiesEarly=False, scansSidebar=False, searchWhenBuried=False, overrideRate=0)
            orders = []
            for order in script['orders']:
                dose = script.get('dose', {})
                orders.append(dict(kind=order['kind'], code=order['name'], drug=order['name'] if order['kind']=='medication' else '',
                                   doseTenths=dose.get('tenths',10000 if order['name']=='ceftriaxone' else 0),
                                   unit=dose.get('unit','mg'), route=dose.get('route','IV' if order['name']=='ceftriaxone' else 'PO'),
                                   freq=dose.get('frequency','daily'), prn=False,
                                   indication=script.get('indication','source-task scenario indication')))
            choices = dict(orders=orders, administer=[], ackResult=False, immunizations=[], noteSections=[])
            task = dict(id=script['id'],day=2,persona=persona,workflow=script['workflow'],patientId=patient,startMin=0,
                        choices=choices,todayResources=[],interruptions=0,
                        timing=dict(arrivalMs=0,readyMs=0,priority=1,resultAgeMs=0,doseWindows=[],clinicalServiceMs=0))
            folder = self.out/'inputs'/script['id']
            for name, value in [('program',program),('persona',params),('schedule',dict(day=2,persona=persona,load='normal',tasks=[task]))]:
                write(folder/(name+'.json'),value)
            self.inputs[script['id']] = dict(spec=str(ROOT/'releases/v2/spec.json'), world=str(self.world),
                **{name:str(folder/(name+'.json')) for name in ['program','persona','schedule']})
        write(self.out/'inputs/manifest.json', self.inputs)
        freeze = read(METHOD/'execution-inputs.json')['sha256']
        actual = {str(p.relative_to(self.out/'inputs')):digest(p)
                  for p in sorted((self.out/'inputs').rglob('*.json')) if p.name != 'manifest.json'}
        if actual != freeze:
            raise ValueError('local task inputs differ from the pre-fit hash freeze; do not refit or inspect holdouts')

    def attempts(self, id, n, phase, backtrack, latency, cv, arm):
        seed = self.protocol['seeds'][phase] + zlib.crc32(id.encode())
        # Separate streams, common offered work across every arm/candidate.
        behavioral = random.Random(seed + zlib.crc32(arm.encode()))
        offered = random.Random(self.protocol['seeds']['exogenous'] + zlib.crc32(id.encode()))
        service = random.Random(seed + 911)
        sigma = math.sqrt(math.log1p(cv*cv))
        mu = math.log(latency)-sigma*sigma/2 if latency else 0
        profile = next(s['profile'] for s in self.scripts['scripts'] if s['id'] == id)
        keyboard = self.scripts['parameters']['roleScenarioDefaults'][profile]['keyboardShare']
        return [dict(seed=behavioral.randrange(2**32),arrivalSeed=offered.randrange(2**32),
                     backtrackRate=backtrack,keyboardShare=keyboard,policy='expert',
                     choiceLatencyMs=round(service.lognormvariate(mu,sigma)) if latency else 0)
                for _ in range(n)]

    def run(self, id, n, phase, backtrack=0, latency=0, cv=0, arm='candidate'):
        attempts = self.attempts(id,n,phase,backtrack,latency,cv,arm)
        key = hashlib.sha256(json.dumps(attempts).encode()).hexdigest()[:16]
        path = self.out/'attempts'/id/f'{key}.json'
        output = path.with_suffix('.jsonl')
        request = dict(**self.inputs[id], attempts=attempts)
        # Resume only completed, identical training requests. Holdout requests
        # are never rerun or silently reused. Parallel chunks preserve attempt
        # order and every frozen seed, with at most four native processes.
        if phase != 'holdout' and path.exists() and read(path) == request and output.exists():
            try:
                cached = [json.loads(line) for line in output.read_text().splitlines()]
            except json.JSONDecodeError:
                cached = []
            if len(cached) == n:
                return summarize(cached)
        if phase == 'holdout' and output.exists():
            raise ValueError(f'{id}: refusing to repeat held-out attempts')
        write(path,request)

        def chunk(index):
            chunk_path = path.with_name(path.stem+f'-part{index}.json')
            chunk_output = chunk_path.with_suffix('.jsonl')
            width = (n+3)//4
            write(chunk_path,dict(**self.inputs[id],attempts=attempts[index*width:(index+1)*width]))
            with chunk_output.open('w') as f:
                p = subprocess.run([str(self.binary),str(chunk_path)],cwd=ROOT,stdout=f,stderr=subprocess.PIPE,text=True,timeout=14400)
            if p.returncode:
                raise RuntimeError(f'{id}: native failure: {p.stderr}')
            return chunk_output.read_text()

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            outputs = list(pool.map(chunk,range(4)))
        output.write_text(''.join(outputs))
        rows = [json.loads(line) for line in output.read_text().splitlines()]
        if len(rows) != n:
            raise ValueError(f'{id}: native attempt count mismatch')
        return summarize(rows)

    def fit(self):
        search = self.scripts['parameters']
        nav_rows = []
        for detour in search['navigationGridPermille']:
            rows = [self.run(id,search['navigationAttemptsPerTask'],'navigation',backtrack=detour)
                    for id in self.protocol['train']]
            loss = sum(-math.log(max(1e-12,r['completion'])) for r in rows)
            nav_rows.append(dict(backtrackRate=detour,loss=loss,tasks=rows))
            print('navigation',detour,loss,flush=True)
        best_nav = min(nav_rows,key=lambda r:(r['loss'],r['backtrackRate']))['backtrackRate']
        latency_rows = []
        for mean in search['latencyGridMsPerMentalOp']:
            for cv in search['latencyCVGrid']:
                if mean == 0 and cv != 0:
                    continue
                loss, rows = 0, []
                for id in self.protocol['train']:
                    r = self.run(id,search['latencyAttemptsPerTask'],'latency',best_nav,mean,cv)
                    t = self.targets[id]
                    loss += ((r['meanSeconds']-t['time_mean_s'])/t['time_sd_s'])**2 + ((r['sdSeconds']-t['time_sd_s'])/t['time_sd_s'])**2 if r['meanSeconds'] is not None else 1e12
                    rows.append(r)
                latency_rows.append(dict(meanChoiceLatencyMs=mean,choiceLatencyCV=cv,loss=loss,tasks=rows))
                print('latency',mean,cv,round(loss,4),flush=True)
        best = min(latency_rows,key=lambda r:(r['loss'],r['meanChoiceLatencyMs'],r['choiceLatencyCV']))
        model = dict(status='experimental',profile='pcp',source='U8',evidenceYear=2021,backtrackRate=best_nav,
                     meanChoiceLatencyMs=best['meanChoiceLatencyMs'],choiceLatencyCV=best['choiceLatencyCV'],
                     navigationIdentified=False,reason='Completion-only tie break; unknown path denominators; source-equivalence and shift endpoints not established.')
        write(self.out/'fit.json',dict(model=model,navigation=nav_rows,latency=latency_rows))
        write(self.out/'frozen-model.json',model)
        return model

    def evaluate(self, model):
        rows = []
        scripts = {s['id']:s for s in self.scripts['scripts']}
        for id in self.protocol['holdout']:
            script = scripts[id]
            row = dict(id=id,profile=script['profile'],limitation=script['limitation'],baseline=None,simulated=None,uncalibrated=None)
            if script['execute']:
                n = self.protocol['attempts']
                # ED is independently scoped; never borrow U8 PCP coefficients.
                defaults = self.scripts['parameters']['roleScenarioDefaults'][script['profile']]
                detour = model['backtrackRate'] if script['profile']=='pcp' else defaults['backtrackRate']
                latency = model['meanChoiceLatencyMs'] if script['profile']=='pcp' else 0
                cv = model['choiceLatencyCV'] if script['profile']=='pcp' else 0
                row['baseline'] = self.run(id,n,'holdout',arm='klm-only')
                row['simulated'] = self.run(id,n,'holdout',detour,latency,cv,arm=script['profile'])
                row['uncalibrated'] = self.run(id,n,'holdout',defaults['backtrackRate'],arm='uncalibrated')
                assert row['baseline']['offeredDigest'] == row['simulated']['offeredDigest'] == row['uncalibrated']['offeredDigest']
            row['assessment'] = assess(self.targets[id],row['simulated'],self.protocol['gate'],script['sourceMatched'])
            rows.append(row)
            print('holdout',id,row['simulated'] and row['simulated']['meanSeconds'],row['assessment']['checks'],flush=True)
        mae = {arm:macro_mae(rows,arm) for arm in ['baseline','simulated','uncalibrated']}
        development = []
        for id in self.protocol['development']:
            script = scripts[id]
            r = self.run(id,200,'latency',model['backtrackRate'],model['meanChoiceLatencyMs'],model['choiceLatencyCV'],arm='dev') if script['execute'] else None
            development.append(dict(id=id,simulated=r,limitation=script['limitation']))
        profiles = {
            'pcp': dict(status='experimental',source='N1',evidenceYear=2023,model=model,
                        independentFamiliesWithMatchedSD=0,shiftHoldouts=[
                            dict(id='N1.totalEHR8',targetMeanMinutes=391.3,targetSDMinutes=149.1,simulated=None,pass_=False,reason='No source-equivalent schedule normalization including unscheduled days.'),
                            dict(id='N1.TOSH8',targetMeanMinutes=84.3,targetSDMinutes=58.8,simulated=None,pass_=False,reason='Active overtime is not N1 outside-scheduled-hours EHR8.')]),
            'ed-resident': dict(status='experimental',source='N4',evidenceYear=2023,backtrackRate=30,keyboardShare=20,meanChoiceLatencyMs=0,
                                independentFamiliesWithMatchedSD=0,reason='N4 quartiles do not supply two independent matched task families; U3 is older transfer only.'),
            'icu-rn-pump': dict(status='experimental',source='N5',evidenceYear=2024,independentFamiliesWithMatchedSD=0,
                               checks=[dict(id='N5.other-interruption',targetMeanSeconds=28,targetSDSeconds=21.9,simulated=None,pass_=False),
                                       dict(id='N5.pump-alert',targetMeanSeconds=17.9,targetSDSeconds=13.9,simulated=None,pass_=False)],
                               reason='Native MAR is not IV-pump programming; interruption and alarm durations are not independent pump task families.'),
        }
        report = dict(protocol=self.protocol['version'],predeclaration=PREDECLARATION,
            scriptFreeze='574944a9',executionFreeze='e5f1d976',runnerSHA256=digest(Path(__file__)),
            sourceHashes={name:digest(METHOD/name) for name in ['protocol.json','scripts.json','execution-inputs.json']},
            binarySHA256=digest(self.binary),simulator=self.protocol['simulator'],holdouts=rows,development=development,
            profiles=profiles,macroMAEAvailableSeconds=mae,
            baselineComparisonPass=all(r.get('baseline') and r['baseline']['meanSeconds'] is not None and
                                      r.get('simulated') and r['simulated']['meanSeconds'] is not None for r in rows)
                                   and mae['simulated'] < mae['baseline'],
            baselineComparisonReason='All 11 comparable held-out times required; unsupported/unsuccessful tasks remain missing.',
            allTimeHoldoutsPass=all(r['assessment']['pass'] for r in rows),clinicianReview=False,
            historicalSensitivity=dict(id='U1-21',status='unsupported',reason='Refill pharmacy-response endpoint unmatched; no sensitivity coefficient fitted.'),
            sensitivityOnly=['N8 Australian pharmacists, 2024; no US default'],scenarioOnly=self.protocol['scenarioOnly'])
        write(self.out/'report.json',report)
        return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,default=Path('/home/saithat/Projects/VGI-Health'))
    parser.add_argument('--out',type=Path,default=ROOT/'runs/wave3-fit')
    parser.add_argument('--prepare-only',action='store_true')
    args = parser.parse_args()
    if os.environ.get('TMPDIR') != '/home/saithat/Projects/run-tmp':
        parser.error('set TMPDIR=/home/saithat/Projects/run-tmp')
    out = args.out.resolve()
    if ROOT/'runs' not in out.parents:
        parser.error('--out must be below gitignored runs/')
    if (out/'report.json').exists() or (out/'frozen-model.json').exists():
        parser.error('refusing to rerun a frozen fit/holdout; preserve the existing output')
    experiment = Experiment(out,args.source.resolve())
    experiment.prepare()
    if not args.prepare_only:
        report = experiment.evaluate(experiment.fit())
        print(json.dumps({k:report[k] for k in ['allTimeHoldoutsPass','macroMAEAvailableSeconds','baselineComparisonPass']},indent=2))


if __name__ == '__main__':
    main()
