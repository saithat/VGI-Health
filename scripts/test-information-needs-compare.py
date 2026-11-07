"""A failed lookup must stay visible and cannot contribute cost savings."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('needs_compare', Path(__file__).with_name('information-needs-compare.py'))
compare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compare)


class ComparisonTests(unittest.TestCase):
    def test_failed_task_excluded_from_deltas_but_retained_in_completion(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = []
            for complete, clicks in [(True, 10), (False, 1)]:
                path = Path(directory) / f'{complete}.json'
                path.write_text(json.dumps({'tasks': [{'task': 'fictional', 'completed': complete, 'clicks': clicks, 'scrolls': 0}],
                                            'policy': 'bounded', 'effort': [], 'trace': [], 'information': []}))
                paths.append(str(path))
            row = compare.summarize([{'day': 1, 'persona': 'P1', 'off': paths[0], 'on': paths[1]}])[0]
            self.assertEqual(row['pairedCompleted'], 0)
            self.assertEqual(row['clicks'], 0)
            self.assertEqual(row['incomplete'], [{'day': 1, 'task': 'fictional', 'off': True, 'on': False}])

    def test_sampling_retains_first_workflow_and_first_drug_category(self):
        def task(identifier, drug=None):
            return {'id': identifier, 'workflow': 'W1', 'choices': {'orders': [{'drug': drug}] if drug else [], 'administer': []}}
        schedule = {'tasks': [task('first'), task('repeat'), task('insulin', 'insulin lispro'), task('repeat-insulin', 'insulin lispro')]}
        self.assertEqual([t['id'] for t in compare.workload(schedule)['tasks']], ['first', 'insulin'])


if __name__ == '__main__':
    unittest.main()
