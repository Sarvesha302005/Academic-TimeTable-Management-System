import json
from collections import defaultdict

with open('config.json') as f:
    cfg = json.load(f)

COURSES = cfg['courses']
TEACHERS = cfg['teachers']
CLASSES = cfg['classes']
DAYS = cfg['schedule']['days']
HOURS = cfg['schedule']['hours']
ROOMS = cfg['rooms']
FIXED = cfg.get('fixed_rooms', {})

report = []

# Per-class theory demand (L+T hours per class)
class_theory_hours = {}
class_practical_sessions = {}
for cls in CLASSES:
    cid = cls['id']
    year = cls['year']
    sems = cls['sems']
    th = 0
    pr = 0
    for code, course in COURSES.items():
        if course['year'] == year and course['sem'] in sems:
            th += course.get('L',0) + course.get('T',0)
            pr += course.get('P',0)
    class_theory_hours[cid] = th
    class_practical_sessions[cid] = pr

report.append('Per-class demand (theory hours, practical sessions):')
for cid in class_theory_hours:
    report.append(f" - {cid}: theory={class_theory_hours[cid]}h, practical_sessions={class_practical_sessions[cid]} (each 2h)")

# Capacity checks
hours_per_day = len(HOURS)
days = len(DAYS)
slots_per_class = hours_per_day * days
report.append('\nAvailability per class (theory slots):')
report.append(f" - hours/day={hours_per_day}, days={days}, slots_per_class={slots_per_class}h")

# Check if any class requires more theory hours than available
impossible_classes = [cid for cid,h in class_theory_hours.items() if h > slots_per_class]
if impossible_classes:
    report.append('\nERROR: These classes demand more theory hours than available slots:')
    for cid in impossible_classes:
        report.append(f"  - {cid}: requires {class_theory_hours[cid]}h > available {slots_per_class}h")
else:
    report.append('\nAll classes fit in their fixed theory-room time window (theory hours).')

# Lab capacity: count required practical sessions total and available 2-hour blocks
total_practical_sessions = sum(class_practical_sessions.values())
# Each practical session is 'P' value per course; earlier we counted sessions per class
# But note: courses may have P>0 meaning number of practical sessions per class
report.append(f"\nTotal practical sessions required (2h each): {total_practical_sessions}")
lab_rooms = len(ROOMS.get('lab', []))
blocks_per_day = max(0, hours_per_day - 1)
available_lab_blocks = lab_rooms * days * blocks_per_day
report.append(f"Available lab 2-hour blocks = lab_rooms({lab_rooms}) * days({days}) * blocks_per_day({blocks_per_day}) = {available_lab_blocks}")
if total_practical_sessions > available_lab_blocks:
    report.append('\nERROR: Not enough lab 2-hour blocks for all practicals.')
    report.append(f"  Required: {total_practical_sessions}, Available: {available_lab_blocks}")
else:
    report.append('\nLab capacity is sufficient for practical sessions.')

# Teacher capacity: total required hours and teacher max sum
total_theory_hours = sum(class_theory_hours.values())
# theory hours are per class; total teaching hours for theory equals total_theory_hours (since each class needs those hours)
total_practical_hours = total_practical_sessions * 2
total_required_hours = total_theory_hours + total_practical_hours
sum_teacher_max = sum(t.get('max',0) for t in TEACHERS)
sum_teacher_min = sum(t.get('min',0) for t in TEACHERS)
report.append(f"\nTotal required teaching hours = theory({total_theory_hours}) + practical({total_practical_hours}) = {total_required_hours}")
report.append(f"Sum of teachers' max capacity = {sum_teacher_max}, min capacity sum = {sum_teacher_min}")
if total_required_hours > sum_teacher_max:
    report.append('\nERROR: Teachers total max capacity insufficient for required hours.')
    report.append(f"  Required: {total_required_hours}, MaxAvailable: {sum_teacher_max}")
else:
    report.append('\nTeacher total capacity seems sufficient.')

# Fixed room mapping validity
report.append('\nFixed room mapping check:')
for cid, room in FIXED.items():
    if room not in ROOMS.get('theory', []):
        report.append(f" - ERROR: Class {cid} fixed room {room} is not a valid theory room")
    else:
        report.append(f" - {cid} -> {room} OK")

# Start-time policy
earliest = min(HOURS)
report.append(f"\nEarliest configured hour = {earliest}")
if earliest < '09:00':
    report.append('NOTE: Config allows hours before 09:00 (solver may block them).')
else:
    report.append('Config enforces start times >= 09:00')

# Print report
print('\n'.join(report))
