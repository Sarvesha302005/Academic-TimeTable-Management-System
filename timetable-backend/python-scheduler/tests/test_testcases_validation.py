import json
import os
import glob


def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)


def test_test_case_files_exist():
    base = os.path.dirname(__file__)
    tc_dir = os.path.join(base, '..', 'test_cases')
    files = glob.glob(os.path.join(tc_dir, 'test_case_*.json'))
    assert files, f'No test case JSON files found in {tc_dir}'


def test_each_test_case_has_required_keys():
    base = os.path.dirname(__file__)
    tc_dir = os.path.join(base, '..', 'test_cases')
    files = glob.glob(os.path.join(tc_dir, 'test_case_*.json'))

    required_top_keys = {'courses', 'teachers', 'classes', 'rooms', 'schedule'}

    for p in files:
        data = load_json(p)
        assert required_top_keys.issubset(set(data.keys())), f'{p} missing required top-level keys'

        # Basic sanity checks
        assert isinstance(data['courses'], dict)
        assert isinstance(data['teachers'], list)
        assert isinstance(data['classes'], list)
        assert 'days' in data['schedule'] and 'hours' in data['schedule']

