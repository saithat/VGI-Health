#!/usr/bin/env python3
"""Validate public workflow evidence; --online also resolves the bibliography.

Uses the standard library. Downloads live responses in memory only. No simulator,
patient data, builds, credentials or external mutations. Run from any directory.
"""
import argparse
import ast
import collections
import concurrent.futures
import hashlib
import html
import json
import math
import pathlib
import re
import subprocess
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / 'docs/design/workflow-sources'
ERRORS = []
CHECKS = 0


def check(condition, message):
    global CHECKS
    CHECKS += 1
    if not condition:
        ERRORS.append(message)


def unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate JSON key: ' + key)
        result[key] = value
    return result


def read(name):
    def invalid(value):
        raise ValueError('non-finite JSON number: ' + value)
    return json.loads((DIRECTORY / (name + '.json')).read_text(),
                      object_pairs_hook=unique, parse_constant=invalid)


def normalized(value):
    return re.sub(r'[^a-z0-9]', '', html.unescape(re.sub(r'<[^>]+>', '', value)).lower())


def anchor(reference):
    file, number = reference.rsplit(':', 1)
    path = ROOT / file
    check(path.exists() and 1 <= int(number) <= len(path.read_text().splitlines()),
          'valid code anchor: ' + reference)


def graph(rows, label):
    indexed = {row['id']: row for row in rows}
    check(len(indexed) == len(rows), label + ': unique IDs')
    for row in rows:
        for key, inverse in [('supersedes', 'supersededBy'), ('supersededBy', 'supersedes')]:
            links = row.get(key)
            check(isinstance(links, list) and len(links) == len(set(links)),
                  label + ': typed distinct links ' + row['id'])
            for target in links:
                check(target in indexed and row['id'] in indexed[target].get(inverse, []),
                      label + ': reciprocal link ' + row['id'] + ' -> ' + target)
    visiting, visited = set(), set()

    def visit(identifier):
        if identifier in visiting:
            check(False, label + ': supersession cycle ' + identifier)
            return
        if identifier in visited:
            return
        visiting.add(identifier)
        for parent in indexed[identifier].get('supersedes', []):
            if parent in indexed:
                visit(parent)
        visiting.remove(identifier)
        visited.add(identifier)
    for identifier in indexed:
        visit(identifier)


def validate():
    source_doc = read('sources')
    sources = {row['id']: row for row in source_doc['sources']}
    parameters = read('literature-parameters')
    rows = parameters['rows']
    archived = parameters['archived_rows']
    tasks_doc = read('usability-tasks')
    tasks = tasks_doc['rows']
    audit = read('research-audit')
    search_ids = {row['id'] for row in audit['searches']}
    for doc in [source_doc, parameters, tasks_doc]:
        check(doc['schema_version'] == 2, 'version 2 evidence schema')
    graph(list(sources.values()), 'sources')
    graph(rows + archived, 'parameters')
    graph(tasks, 'tasks')
    for source in sources.values():
        identifier = source['id']
        for key in ['title', 'authors', 'year', 'venue', 'url', 'read_level',
                    'metadata_verified', 'evidence_year_basis']:
            check(bool(source.get(key)), identifier + ': bibliography field ' + key)
        check('doi' in source and 'pmid' in source, identifier + ': explicit identifier presence/absence')
        check(source['url'].startswith('https://'), identifier + ': HTTPS')
        check(isinstance(source['year'], int), identifier + ': publication year type')
        year = source['evidence_year']
        check(isinstance(year, int) and 1900 <= year <= 2026, identifier + ': evidence year type/range')
        expected = 'current' if year >= 2020 else 'older-retained'
        check(source['recency'] == expected, identifier + ': evidence-year recency')
        if expected == 'older-retained':
            check(source.get('retention_reason', '').startswith('Older evidence ('),
                  identifier + ': dated retention reason')
        if source['kind'] == 'literature':
            check(bool(source['pmid'] or source['doi']), identifier + ': literature identifier')
    for collection in [rows, archived, tasks]:
        for row in collection:
            identifier = row['id']
            citation = row['citation']
            check(citation['source_id'] in sources, identifier + ': known source')
            source = sources[citation['source_id']]
            check(citation['url'] == source['url'], identifier + ': canonical citation URL')
            check(bool(citation['locator']), identifier + ': locator')
            check(row['recency'] == source['recency'] and row['evidence_year'] == source['evidence_year'],
                  identifier + ': inherited evidence date/recency')
            if row['recency'] == 'older-retained':
                check(bool(row.get('retention_reason')), identifier + ': retention reason')
            check(row['recency_search'] in search_ids, identifier + ': known recency search')
    for collection, coverage_key in [(rows + archived, 'parameter_coverage'), (tasks, 'task_coverage')]:
        coverage = audit[coverage_key]
        check(set(coverage) == {row['id'] for row in collection}, coverage_key + ': exact coverage')
        for row in collection:
            check(row['recency_search'] in coverage[row['id']], row['id'] + ': covered by recorded search')
    check(set(audit['top_ten_coverage']) == {str(i) for i in range(1, 11)}, 'all ten priorities searched')
    for identifiers in [*audit['top_ten_coverage'].values(), *audit['parameter_coverage'].values(),
                        *audit['task_coverage'].values()]:
        check(bool(identifiers) and set(identifiers) <= search_ids, 'nonempty valid query coverage')
    for query in audit['searches']:
        check('2020-01-01' in query['query'] and '2026-11-08' in query['query'], 'dated search window')
        check(query['hit_count'] >= query['screened_result_count'] >= 0, 'query result counts')
        check(set(query['selected_source_ids']) <= set(sources), 'query candidates registered')
    for row in rows + archived:
        for key in ['id', 'parameter', 'unit', 'setting', 'denominator', 'caveat']:
            check(isinstance(row.get(key), str) and bool(row[key]), row['id'] + ': parameter field ' + key)
        check(isinstance(row['value'], (int, float, dict, list)), row['id'] + ': aggregate value type')
    for row in tasks:
        identifier = row['id']
        check(isinstance(row['participants_n'], int) and row['participants_n'] > 0, identifier + ': positive n')
        check(isinstance(row['success_pct'], (int, float)) and 0 <= row['success_pct'] <= 100,
              identifier + ': completion percent')
        check(bool(row['steps']) and bool(row['workflow_mapping']), identifier + ': steps and mapping')
        for key in ['time_mean_s', 'time_sd_s', 'path_ratio', 'click_count', 'error_pct']:
            value = row[key]
            check(value is None or isinstance(value, (int, float)) and math.isfinite(value) and value >= 0,
                  identifier + ': nonnegative optional numeric ' + key)
        if row['path_observed_steps'] is not None:
            check(abs(row['path_ratio'] - row['path_observed_steps'] / row['path_optimal_steps']) < 1e-6,
                  identifier + ': path arithmetic')
        source_id = row['citation']['source_id']
        if source_id == 'U4':
            check(row['time_mean_s'] is None and row['time_sd_s'] is None, identifier + ': missing absolute times')
        if source_id == 'U1':
            check(row['error_count'] == row['noncompletion_failures_count'] + row['timeout_failures_count'],
                  identifier + ': reported failure counts')
    counts = collections.Counter(row['citation']['source_id'] for row in tasks)
    check(counts == {'U1': 8, 'U2': 8, 'U3': 9, 'U4': 7, 'U5': 3, 'U8': 6, 'U9': 2}, 'task extraction counts')
    check(tasks_doc['certification_report_count'] == 6, 'six extracted certification reports')
    task_ids = {row['id']: row for row in tasks}
    holdouts = ['U9-2', 'U9-4'] + [row['id'] for row in tasks if row['citation']['source_id'] == 'U3']
    train = ['U8-2', 'U8-3', 'U8-5', 'U1-21']
    development = ['U8-6', 'U8-7', 'U8-9']
    check(len(holdouts) == 11 and not set(holdouts) & (set(train) | set(development)), 'frozen disjoint holdouts')
    for identifier in train + development + holdouts:
        check(identifier in task_ids and task_ids[identifier]['time_sd_s'] is not None, 'eligible timed task ' + identifier)
    inventory = read('code-assumptions')
    check(len(inventory['families']) == 50, '50 assumption families')
    check(len(inventory['explicit_assumption_markers']) == 29, '29 markers')
    check(len(inventory['world_stochastic_callsites']) == 267, '267 callsites')
    for file, digest in inventory['source_file_sha256'].items():
        check(hashlib.sha256((ROOT / file).read_bytes()).hexdigest() == digest, 'unchanged inventory source ' + file)
    for row in inventory['families']:
        check(bool(row['citation']) and bool(row['disposition']) and bool(row['current']), 'inventory fields')
        for reference in row['code_refs']:
            anchor(reference)
    for key, field in [('explicit_assumption_markers', 'excerpt'), ('world_stochastic_callsites', 'expression')]:
        for row in inventory[key]:
            anchor(row['citation'])
            file, number = row['citation'].rsplit(':', 1)
            check((ROOT / file).read_text().splitlines()[int(number) - 1].strip() == row[field],
                  'exact inventory expression ' + row['citation'])
    document = ROOT / 'docs/design/workflow-calibration.md'
    body = document.read_text()
    definitions = dict(re.findall(r'^\[([^\]]+)\]:\s+(\S+)', body, re.M))
    for label in re.findall(r'\[[^\]\n]+\]\[([^\]\n]+)\]', body):
        check(label in definitions, 'defined reference ' + label)
    for label, url in definitions.items():
        check(label in sources and sources[label]['url'] == url, 'registered reference ' + label)
    for target in re.findall(r'\[[^\]\n]+\]\(([^)]+)\)', body):
        if not target.startswith(('https://', 'http://', '#')):
            check((document.parent / target.split('#')[0]).exists(), 'local link ' + target)
    for reference in re.findall(r'`((?:lean|world|agent|app)/[^`\s]+:\d+)`', body):
        anchor(reference)
    for identifier in ['A' + str(i).zfill(2) for i in range(1, 51)]:
        check(identifier in body, 'document inventory ' + identifier)
    current_count = sum(row['recency'] == 'current' for row in rows)
    check(f'{len(rows)} active literature rows' in body, 'document parameter count')
    check(f'{current_count} current / {len(rows)-current_count} older-retained' in body, 'document recency counts')
    check('No clinician review' in body and '10,000' in body and 'source_SD' in body, 'explicit statistical acceptance')
    files = [ROOT / 'README.md', document, *sorted(DIRECTORY.glob('*.json')), pathlib.Path(__file__)]
    for path in files:
        content = path.read_text()
        check(content.endswith('\n'), 'final newline ' + str(path))
        check(all(not line.endswith((' ', '\t')) for line in content.splitlines()), 'trailing whitespace ' + str(path))
    ast.parse(pathlib.Path(__file__).read_text())
    check('scripts/verify-workflow-sources.py --online' in (ROOT / 'README.md').read_text(), 'README verification command')
    allowed = {'README.md', 'docs/design/workflow-calibration.md', 'scripts/verify-workflow-sources.py',
               *(str(path.relative_to(ROOT)) for path in DIRECTORY.glob('*.json'))}
    changed = set(subprocess.check_output(['git', 'diff', '--name-only', 'HEAD'], cwd=ROOT, text=True).splitlines())
    untracked = set(subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard'], cwd=ROOT, text=True).splitlines())
    check(changed | untracked <= allowed, 'research-only changed paths')
    staged = set(subprocess.check_output(['git', 'diff', '--cached', '--name-only'], cwd=ROOT, text=True).splitlines())
    check(staged <= allowed, 'research-only staged paths')
    check(subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip() == 'lane/workflow-sources',
          'authorized branch')
    return sources, rows, archived, tasks


def fetch(url):
    # CDC rejects the descriptive identifier accepted by the report hosts.
    hostname = urllib.parse.urlparse(url).hostname or ''
    headers = {} if hostname.endswith('.cdc.gov') else {'User-Agent': 'VGI-public-evidence-check/1.0'}
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.status, response.geturl(), response.read()


def online(sources):
    resolved = []
    access_failures = []
    pmid_sources = [source for source in sources.values() if source.get('pmid')]
    query = ' OR '.join('EXT_ID:' + source['pmid'] for source in pmid_sources)
    url = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search?' + urllib.parse.urlencode(
        {'query': '(' + query + ') AND SRC:MED', 'format': 'json', 'resultType': 'core', 'pageSize': 100})
    try:
        _, _, content = fetch(url)
        records = {row['id']: row for row in json.loads(content)['resultList']['result']}
    except Exception as error:
        check(False, 'NLM bibliography resolution failed: ' + str(error))
        records = {}
    for source in pmid_sources:
        identifier = source['id']
        record = records.get(source['pmid'])
        check(record is not None, identifier + ': PMID resolves')
        if record is None:
            continue
        check(normalized(record['title']) == normalized(source['title']), identifier + ': title matches PMID')
        check(int(record['pubYear']) == source['year'], identifier + ': publication year matches PMID')
        check((record.get('doi') or '').lower() == (source.get('doi') or '').lower(), identifier + ': DOI matches PMID')
        check(normalized(record['journalInfo']['journal'].get('medlineAbbreviation', '')) == normalized(source['venue']),
              identifier + ': venue matches PMID')
        if identifier == 'I7':
            check(bool(source.get('metadata_caveat')) and bool(source.get('author_verification_url')),
                  'I7: explicit NLM institutional-author indexing caveat')
            authors = record['authorString'].replace('Clinic M, ', '')
        else:
            authors = record['authorString']
        check(normalized(authors) == normalized(source['authors']), identifier + ': authors match PMID')
        resolved.append({'id': identifier, 'method': 'Europe PMC/NLM identifier and bibliographic fields',
                         'url': source['url'], 'doi': source.get('doi')})
    others = [source for source in sources.values() if not source.get('pmid')]

    def resolve(source):
        identifier = source['id']
        url = ('https://api.crossref.org/works/' + urllib.parse.quote(source['doi'], safe='')) if source.get('doi') else source['url']
        try:
            status, final, content = fetch(url)
            return source, status, final, content, None
        except Exception as error:
            return source, None, url, b'', str(error)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        for source, status, url, content, error in executor.map(resolve, others):
            identifier = source['id']
            if error:
                access_failures.append({'id': identifier, 'url': url, 'error': error})
                check(False, identifier + ': live public URL unavailable: ' + error)
                continue
            check(status == 200 and len(content) > 100, identifier + ': public citation resolves')
            if source.get('doi'):
                record = json.loads(content)['message']
                check(normalized(record['title'][0]) == normalized(source['title']), identifier + ': Crossref title')
                years = {record[key]['date-parts'][0][0] for key in ['published', 'published-print', 'published-online'] if key in record}
                check(source['year'] in years, identifier + ': Crossref year')
                check(normalized(record['container-title'][0]) == normalized(source['venue']), identifier + ': Crossref venue')
                # Full names and initials differ in conceptual references: compare family names.
                check(all(normalized(author['family']) in normalized(source['authors']) for author in record['author']),
                      identifier + ': Crossref authors')
            if source.get('sha256'):
                check(hashlib.sha256(content).hexdigest() == source['sha256'], identifier + ': exact report SHA256')
            resolved.append({'id': identifier, 'method': 'Crossref metadata' if source.get('doi') else 'public URL',
                             'http_status': status, 'url': url})
    return {'date': '2026-11-08', 'resolved': resolved, 'access_failures': access_failures}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--online', action='store_true', help='check live public bibliography and report hashes')
    parser.add_argument('--resolution-output', type=pathlib.Path, help='optional public-only resolution diagnostics JSON')
    args = parser.parse_args()
    sources, rows, archived, tasks = validate()
    if args.online:
        result = online(sources)
        if args.resolution_output:
            args.resolution_output.write_text(json.dumps(result, indent=2) + '\n')
        print(f"Live bibliography: {len(result['resolved'])}/{len(sources)} resolved; {len(result['access_failures'])} access failures.")
    if ERRORS:
        print('\n'.join(ERRORS))
        raise SystemExit(f'FAIL: {len(ERRORS)} failures / {CHECKS} checks')
    counts = collections.Counter(row['recency'] for row in rows)
    print(f'PASS: {CHECKS} structural, type, provenance, citation, recency, search, partition and lane checks; '
          f'{len(sources)} sources; {len(rows)} active parameters ({dict(counts)}); '
          f'{len(archived)} archived; {len(tasks)} tasks.')


if __name__ == '__main__':
    main()
