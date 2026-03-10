import json
import os


def load(path):
    with open(path, 'r') as f:
        return json.load(f)


def test_teacher_workload_potential_overload():
    base = os.path.dirname(__file__)
    tc = os.path.join(base, '..', 'test_cases', 'test_case_2_teacher_workload.json')
    data = load(tc)

    # Estimate required hours per teacher if assignments were naive:
    # evenly distribute course hours across available teachers
    teacher_ids = [t['id'] for t in data['teachers']]
    teacher_max = {t['id']: t.get('max', 999) for t in data['teachers']}

    # Compute course hours
    course_hours = {}
    for ccode, c in data['courses'].items():
        course_hours[ccode] = c.get('L', 0) + c.get('T', 0) + c.get('P', 0) * 2

    # Sum hours needed across classes
    total_hours = 0
    for ccode, hours in course_hours.items():
        for cls in data['classes']:
            if ccode in cls.get('courses', []):
                total_hours += hours

    # If average per teacher stays within hard max limits, test passes (per spec)
    avg_per_teacher = total_hours / max(1, len(teacher_ids))

    # All teachers should be able to handle avg_per_teacher within their hard max
    assert all(avg_per_teacher <= teacher_max[tid] for tid in teacher_ids), (
        f"Unexpected overload: avg={avg_per_teacher}, teacher_max={teacher_max}"
    )
