import json
from collections import defaultdict

ROOT = '.'
with open('config.json') as f:
    cfg = json.load(f)
with open('solution.json') as f:
    sol = json.load(f)

fixed = cfg.get('fixed_rooms', {})
courses = cfg['courses']
teachers = {t['name']: t for t in cfg['teachers']}

report = []
# 1. Fixed room check for L/T
fixed_ok = True
for cls, sessions in sol.items():
    for s in sessions:
        if s['type'] in ('L', 'T'):
            fr = fixed.get(cls)
            if fr and s['room'] != fr:
                fixed_ok = False
                report.append(f"FIXED_ROOM_VIOLATION: {cls} {s['course']} {s['type']} at {s['slot']} in {s['room']} (expected {fr})")

# 2. Start time check
start_ok = True
for cls, sessions in sol.items():
    for s in sessions:
        slot = s['slot']
        if '_' in slot:
            hour = slot.split('_',1)[1]
            if hour < '09:00':
                start_ok = False
                report.append(f"EARLY_SLOT: {cls} {s['course']} {s['type']} at {slot}")

# 3. L/T/P counts and practical contiguity
ltp_ok = True
for cls, sessions in sol.items():
    by_course = defaultdict(lambda: defaultdict(list))
    for s in sessions:
        by_course[s['course']][s['type']].append(s)
    for course_code, types in by_course.items():
        cfgc = courses[course_code]
        L = len(types.get('L', []))
        T = len(types.get('T', []))
        P = len(types.get('P', []))
        # in this model each practical hour is counted; expected P_hours = P_cfg * 2
        expected_L = cfgc['L']
        expected_T = cfgc.get('T', 0)
        expected_P_hours = cfgc.get('P', 0) * 2
        if L != expected_L:
            ltp_ok = False
            report.append(f"L_COUNT_MISMATCH: {cls} {course_code} L={L} expected={expected_L}")
        if T != expected_T:
            ltp_ok = False
            report.append(f"T_COUNT_MISMATCH: {cls} {course_code} T={T} expected={expected_T}")
        if P != expected_P_hours:
            ltp_ok = False
            report.append(f"P_HOURS_MISMATCH: {cls} {course_code} P_hours={P} expected={expected_P_hours}")
        # check practicals are in consecutive pairs
        if expected_P_hours > 0:
            # group practical slots by day
            slots = [s['slot'] for s in types.get('P', [])]
            pairs = 0
            used = set()
            for s in slots:
                day, hour = s.split('_')
                # find next hour
                for other in slots:
                    if other in used: continue
                    if other == s: continue
                    od, oh = other.split('_')
                    if od == day:
                        # assume hours are HH:MM lexicographically increasing
                        # check consecutive hours
                        hrs = [h for h in [hour, oh]]
                        try:
                            # compute difference in index
                            idx1 = cfg['schedule']['hours'].index(hour)
                            idx2 = cfg['schedule']['hours'].index(oh)
                        except ValueError:
                            continue
                        if abs(idx1-idx2) == 1:
                            pairs += 1
                            used.add(s)
                            used.add(other)
                            break
            expected_pairs = cfgc.get('P',0)
            if pairs != expected_pairs:
                ltp_ok = False
                report.append(f"P_PAIR_MISMATCH: {cls} {course_code} pairs={pairs} expected={expected_pairs}")

# 4. Teacher double-booking
teacher_slot = defaultdict(list)
for cls, sessions in sol.items():
    for s in sessions:
        teacher_slot[(s['teacher'], s['slot'])].append((cls, s))
double_bookings = [(k,v) for k,v in teacher_slot.items() if len(v)>1]
if double_bookings:
    for (teacher, slot), items in double_bookings:
        report.append(f"TEACHER_DOUBLE_BOOKED: {teacher} at {slot} -> {len(items)} assignments")

# 5. Room conflicts
room_slot = defaultdict(list)
for cls, sessions in sol.items():
    for s in sessions:
        room_slot[(s['room'], s['slot'])].append((cls, s))
room_conflicts = [(k,v) for k,v in room_slot.items() if len(v)>1]
if room_conflicts:
    for (room, slot), items in room_conflicts:
        report.append(f"ROOM_CONFLICT: {room} at {slot} -> {len(items)} assignments")

# 5b. Room capacity violations (if configured)
room_caps = cfg.get('room_capacities', {})
if room_caps:
    for cls, sessions in sol.items():
        strength = next((c['strength'] for c in cfg['classes'] if c['id'] == cls), 0)
        for s in sessions:
            cap = room_caps.get(s['room'])
            if cap is not None and cap < strength:
                report.append(f"ROOM_CAPACITY_VIOLATION: {cls} {s['room']} cap={cap} < strength={strength} for {s['course']} {s['type']} at {s['slot']}")

# 6. Teacher workloads and tightness
teacher_hours = defaultdict(int)
for cls, sessions in sol.items():
    for s in sessions:
        teacher_hours[s['teacher']] += 1

tight = []
for tname, tcfg in teachers.items():
    hrs = teacher_hours.get(tname,0)
    if hrs == tcfg.get('min',0):
        tight.append(f"TEACHER_AT_MIN: {tname} hours={hrs} min={tcfg.get('min')}")
    if hrs == tcfg.get('max',999):
        tight.append(f"TEACHER_AT_MAX: {tname} hours={hrs} max={tcfg.get('max')}")

# 7. Same-room-for-lectures check: ensure each class uses exactly one theory room for L/T
class_room_use = {}
for cls, sessions in sol.items():
    rooms = set()
    for s in sessions:
        if s['type'] in ('L','T') and s['room'] in cfg['rooms']['theory']:
            rooms.add(s['room'])
    class_room_use[cls] = rooms
    if len(rooms) != 1:
        report.append(f"SAME_ROOM_VIOLATION: {cls} uses theory rooms {sorted(list(rooms))}")

# Summarize
print('CONSTRAINTS REPORT')
print('------------------')
print(f'Fixed rooms enforced: {"YES" if fixed_ok else "NO"}')
print(f'Start time >=09:00 enforced: {"YES" if start_ok else "NO"}')
print(f'L/T/P counts matching config: {"YES" if ltp_ok else "NO"}')
print(f'Teacher double-bookings found: {len(double_bookings)}')
print(f'Room conflicts found: {len(room_conflicts)}')
print('')
if tight:
    print('Tight constraints:')
    for t in tight:
        print(' -', t)
else:
    print('No teacher at min/max boundaries')

if report:
    print('\nDetailed issues:')
    for r in report:
        print(' -', r)
else:
    print('\nNo issues detected. All checked constraints satisfied.')

# Print brief stats
print('\nStats:')
print(' - Total classes:', len(sol))
print(' - Total teacher hours:')
for tname, hrs in sorted(teacher_hours.items()):
    print(f"    {tname}: {hrs}")

# Print which theory room each class uses
print('\nClass theory room usage:')
for cls, rooms in class_room_use.items():
    print(f' - {cls}: {sorted(list(rooms))}')
