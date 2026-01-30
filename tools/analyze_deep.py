import json
from collections import defaultdict, Counter

with open('config.json') as f:
    cfg = json.load(f)
with open('solution.json') as f:
    sol = json.load(f)

DAYS = cfg['schedule']['days']
HOURS = cfg['schedule']['hours']
SLOTS = [f"{d}_{h}" for d in DAYS for h in HOURS]

# Flatten sessions
sessions = []
for cls, sess_list in sol.items():
    for s in sess_list:
        sessions.append({
            'class': cls,
            'course': s['course'],
            'type': s['type'],
            'slot': s['slot'],
            'teacher': s['teacher'],
            'room': s['room'],
        })

# Timeslot occupancy
slot_count = Counter(s['slot'] for s in sessions)
# Top busiest slots
busiest = slot_count.most_common(10)

# Room utilization
room_count = Counter(s['room'] for s in sessions)
room_top = room_count.most_common(10)

# Teacher utilization and slot map
teacher_slots = defaultdict(list)
for s in sessions:
    teacher_slots[s['teacher']].append(s['slot'])
teacher_hours = {t: len(slots) for t, slots in teacher_slots.items()}

# Map teacher config by name
cfg_teachers_by_name = {t['name']: t for t in cfg['teachers']}

# Teacher slack and percent
teacher_stats = []
for name, hrs in sorted(teacher_hours.items(), key=lambda x: -x[1]):
    cfgt = cfg_teachers_by_name.get(name, {})
    mx = cfgt.get('max', 0)
    mn = cfgt.get('min', 0)
    pct = (hrs / mx * 100) if mx else None
    slack = mx - hrs if mx else None
    teacher_stats.append((name, hrs, mn, mx, pct, slack))

# Timeslot composition (labs vs theory)
slot_lab = Counter()
slot_theory = Counter()
for s in sessions:
    if s['type'] == 'P':
        slot_lab[s['slot']] += 1
    else:
        slot_theory[s['slot']] += 1

# For each scheduled session, find alternative teachers (who prefer the course) and whether they are free at that slot
course_prefs = defaultdict(list)
for t in cfg['teachers']:
    for c in t.get('prefs', []):
        course_prefs[c].append(t['name'])

# teacher availability map from teacher_slots
teacher_busy = {t: set(slots) for t, slots in teacher_slots.items()}

alternatives = []
for s in sessions:
    course = s['course']
    slot = s['slot']
    assigned = s['teacher']
    candidates = course_prefs.get(course, [])
    free_candidates = [c for c in candidates if slot not in teacher_busy.get(c, set()) and c != assigned]
    # also include any teacher who has course in prefs but not assigned
    alternatives.append((s['class'], course, s['type'], slot, assigned, len(free_candidates), free_candidates))

# Adjacency checks: consecutive practicals per teacher (whether same class+course+room)
# Build per-teacher slot->session map
teacher_slot_sessions = defaultdict(dict)
for s in sessions:
    teacher_slot_sessions[s['teacher']][s['slot']] = s

adj_issues = []
for teacher, slotmap in teacher_slot_sessions.items():
    # convert slots to indices
    indices = []
    for slot in slotmap:
        day, hour = slot.split('_')
        try:
            day_idx = DAYS.index(day)
            hour_idx = HOURS.index(hour)
            idx = day_idx * len(HOURS) + hour_idx
            indices.append((idx, slot))
        except ValueError:
            continue
    indices.sort()
    for (i, slot) in indices:
        # check next slot
        next_idx = i + 1
        # map back
        next_day = DAYS[next_idx // len(HOURS)] if next_idx // len(HOURS) < len(DAYS) else None
        if next_day is None:
            continue
        next_hour = HOURS[next_idx % len(HOURS)]
        next_slot = f"{next_day}_{next_hour}"
        if next_slot in slotmap:
            s1 = slotmap[slot]
            s2 = slotmap[next_slot]
            if s1['type'] == 'P' and s2['type'] == 'P':
                # allow only if same class+course+room
                if not (s1['class'] == s2['class'] and s1['course'] == s2['course'] and s1['room'] == s2['room']):
                    adj_issues.append((teacher, slot, next_slot, s1, s2))

# Class-level slack (free slots)
class_assigned = defaultdict(set)
for s in sessions:
    class_assigned[s['class']].add(s['slot'])
class_slack = {cls: len(SLOTS) - len(slots) for cls, slots in class_assigned.items()}

# Output summary
print('DEEP ANALYSIS REPORT')
print('====================')
print('\nTop busiest timeslots:')
for slot, cnt in busiest:
    print(f' - {slot}: {cnt} sessions (labs={slot_lab[slot]} theory={slot_theory[slot]})')

print('\nTop rooms by utilization:')
for room, cnt in room_top[:10]:
    print(f' - {room}: {cnt} sessions')

print('\nTeacher utilization (hours, min, max, % of max, slack):')
for name, hrs, mn, mx, pct, slack in teacher_stats:
    pct_s = f"{pct:.0f}%" if pct is not None else 'N/A'
    print(f' - {name}: {hrs}h (min={mn} max={mx}) {pct_s} slack={slack}')

print('\nTeachers with consecutive practical adjacency issues:')
if not adj_issues:
    print(' - None')
else:
    for t, s1, s2, a, b in adj_issues[:20]:
        print(f" - {t}: {s1} ({a['class']} {a['course']} {a['room']}) -> {s2} ({b['class']} {b['course']} {b['room']})")

print('\nSample alternative-teacher availability for sessions (class,course,type,slot,assigned,#free_alts,free_alt_names):')
for item in alternatives[:30]:
    cls, course, typ, slot, assigned, nfree, free_list = item
    print(f' - {cls} {course} {typ} {slot} -> {assigned}, alts_free={nfree} {free_list}')

print('\nClass slack (free slots):')
for cls, slack in class_slack.items():
    print(f' - {cls}: {slack} free slots ({len(SLOTS)} total)')

# Save a compact JSON with hotspots
out = {
    'busiest_slots': busiest,
    'top_rooms': room_top[:20],
    'teacher_stats': teacher_stats,
    'adjacency_issues': [(t, s1, s2) for t, s1, s2, a, b in adj_issues],
}
with open('deep_analysis_summary.json', 'w') as f:
    json.dump(out, f, indent=2)

print('\nSaved deep summary to deep_analysis_summary.json')
