import json
import os
import math


def load(path):
    with open(path, 'r') as f:
        return json.load(f)


def test_tight_resources_detected():
    base = os.path.dirname(__file__)
    tc = os.path.join(base, '..', 'test_cases', 'test_case_7_edge_tight_resources.json')
    data = load(tc)

    # Compute total teaching-hours required per week (each entry L/T = 1 hour, P = 2 hours)
    total_required_hours = 0
    for ccode, c in data['courses'].items():
        l = c.get('L', 0)
        t = c.get('T', 0)
        p = c.get('P', 0)
        hours = l + t + (p * 2)
        # Each class that includes this course needs those hours
        for cls in data['classes']:
            if ccode in cls.get('courses', []):
                total_required_hours += hours

    # Available slots = days * hours * (theory_rooms + lab_rooms)
    days = len(data['schedule']['days'])
    hours_per_day = len(data['schedule']['hours'])
    rooms = len(data['rooms'].get('theory', [])) + len(data['rooms'].get('lab', []))
    available_hours = days * hours_per_day * rooms

    # Check teacher capacity: if sum of teacher max < required_hours -> overloaded
    teacher_capacity = sum(t.get('max', 0) for t in data.get('teachers', []))
    assert total_required_hours > 0
    assert teacher_capacity < total_required_hours, (
        f"Expected teacher capacity to be insufficient: required={total_required_hours}, capacity={teacher_capacity}"
    )
