#!/usr/bin/env python3
"""Regression: a failed bounded task cannot disappear from completion evidence."""
import importlib.util
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location('user_model_compare', Path(__file__).with_name('user-model-compare.py'))
MODEL = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODEL)


def metric(task, completed):
    return {'task': task, 'completed': completed, 'clicks': 1,
            'scrolls': 0, 'keystrokes': 0, 'klmDeciSec': 10}


def result():
    return {'tasks': [metric('done', True), metric('lost', False)],
            'expert': {'tasks': [metric('done', True), metric('lost', True)]},
            'expertTravelUnits': [['done', 10], ['lost', 10]],
            'effort': [{'task': 'done', 'misses': 0, 'searches': 1,
                        'scannedItems': 2, 'backtracks': 0,
                        'mouseTravelUnits': 10, 'cognitiveMs': 200}]}


class CompletionEvidenceTests(unittest.TestCase):
    def test_failed_or_omitted_expert_completed_task_is_named(self):
        data = result()
        row = MODEL.summarize('fixture', data)
        self.assertEqual(row['completionRegressions'], ['lost'])
        self.assertEqual(row['matchedTasks'], 1)
        data['tasks'].pop()
        self.assertEqual(MODEL.summarize('fixture', data)['completionRegressions'], ['lost'])

    def test_expert_failure_is_reported_without_becoming_a_bounded_regression(self):
        data = result()
        data['expert']['tasks'][1]['completed'] = False
        row = MODEL.summarize('fixture', data)
        self.assertEqual(row['completionRegressions'], [])
        self.assertEqual(row['boundedCompleted'], row['expertCompleted'])
        self.assertEqual(row['sampleTasks'], 2)


if __name__ == '__main__':
    unittest.main()
