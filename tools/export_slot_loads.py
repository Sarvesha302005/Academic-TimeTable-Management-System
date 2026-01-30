import json
import csv
from collections import Counter

with open('solution.json') as f:
    sol = json.load(f)

# Flatten sessions
sessions = []
for cls, sess_list in sol.items():
    for s in sess_list:
        sessions.append(s)

slot_total = Counter()
slot_lab = Counter()
slot_theory = Counter()

for s in sessions:
    slot = s['slot']
    slot_total[slot] += 1
    if s['type'] == 'P':
        slot_lab[slot] += 1
    else:
        slot_theory[slot] += 1

all_slots = sorted(set(slot_total.keys()))

with open('slot_loads.csv', 'w', newline='') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['slot', 'total_sessions', 'lab_sessions', 'theory_sessions'])
    for slot in all_slots:
        writer.writerow([slot, slot_total.get(slot,0), slot_lab.get(slot,0), slot_theory.get(slot,0)])

print('Wrote slot_loads.csv')
