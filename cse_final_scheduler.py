"""
CSE TIMETABLE SCHEDULER - Complete Working Example
Demonstrates all constraints for a real CSE timetable with:
- Workload management (min/max hours)
- LTP distribution with consecutive practicals
- Teacher preferences
- Room allocation (theory/lab)
- Class-section organization  
- Realistic constraints

Configuration loaded from: config.json
"""

from ortools.sat.python import cp_model
from collections import defaultdict
import json
import os

# ============================================================================
# PATHS - Relative to project root
# ============================================================================
PROJECT_ROOT = os.path.dirname(__file__)
CONFIG_DIR = os.path.join(PROJECT_ROOT, "config")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "output")

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ============================================================================
# LOAD CONFIGURATION FROM JSON
# ============================================================================

def load_config(config_file="config.json"):
    """Load scheduler configuration from JSON file"""
    config_path = os.path.join(CONFIG_DIR, config_file)
    
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    return config

# Load configuration
try:
    CONFIG = load_config()
    COURSES = CONFIG["courses"]
    TEACHERS = CONFIG["teachers"]
    CLASSES = CONFIG["classes"]
    DAYS = CONFIG["schedule"]["days"]
    HOURS = CONFIG["schedule"]["hours"]
    ROOMS = CONFIG["rooms"]
    TIMESLOTS = [f"{d}_{h}" for d in DAYS for h in HOURS]
except Exception as e:
    print(f"[ERROR] Failed to load configuration: {e}")
    raise

print("\n" + "="*120)
print("CSE TIMETABLE SCHEDULER - WORKING EXAMPLE")
print("="*120)
print(f"Setup: {len(COURSES)} courses, {len(TEACHERS)} teachers, {len(CLASSES)} classes, "
      f"{len(ROOMS['theory']) + len(ROOMS['lab'])} rooms, {len(TIMESLOTS)} timeslots\n")

# ============================================================================
# SCHEDULER
# ============================================================================

class Scheduler:
    def __init__(self):
        self.model = cp_model.CpModel()
        self.schedule = {}
    
    def solve(self):
        """Main solve function"""
        self._create_variables()
        self._apply_constraints()
        self._set_objective()
        return self._solve_model()
    
    def _create_variables(self):
        """Create decision variables: assignment[class, course, session_type, slot, teacher, room]"""
        print("Creating variables...")
        
        self.vars = {}
        var_count = 0
        
        for cls in CLASSES:
            for course_code, course in COURSES.items():
                # Only schedule courses for this class's year and semesters
                if course["year"] != cls["year"] or course["sem"] not in cls["sems"]:
                    continue
                
                # Lectures - always in theory room
                for ts in TIMESLOTS:
                    for teacher in TEACHERS:
                        for room in ROOMS["theory"]:
                            var = self.model.NewBoolVar(f"L_{cls['id']}_{course_code}_{ts}_{teacher['id']}_{room}")
                            self.vars[(cls["id"], course_code, "L", ts, teacher["id"], room)] = var
                            var_count += 1
                
                # Tutorials (if needed) - always in theory room
                if course["T"] > 0:
                    for ts in TIMESLOTS:
                        for teacher in TEACHERS:
                            for room in ROOMS["theory"]:
                                var = self.model.NewBoolVar(f"T_{cls['id']}_{course_code}_{ts}_{teacher['id']}_{room}")
                                self.vars[(cls["id"], course_code, "T", ts, teacher["id"], room)] = var
                                var_count += 1
                
                # Practicals (if needed)
                if course["P"] > 0:
                    # Labs if course requires lab, otherwise theory
                    room_list = ROOMS["lab"] if course["lab"] else ROOMS["theory"]
                    for ts in TIMESLOTS:
                        for teacher in TEACHERS:
                            for room in room_list:
                                var = self.model.NewBoolVar(f"P_{cls['id']}_{course_code}_{ts}_{teacher['id']}_{room}")
                                self.vars[(cls["id"], course_code, "P", ts, teacher["id"], room)] = var
                                var_count += 1
        
        print(f"  [OK] Created {var_count} variables")
    
    def _apply_constraints(self):
        """Apply all hard constraints by delegating to named constraint functions."""
        print("Applying constraints...")
        
        constraint_count = 0
        constraint_count += self._constraint_ltp_requirements()
        constraint_count += self._constraint_teacher_workload()
        constraint_count += self._constraint_no_teacher_double_booking()
        constraint_count += self._constraint_no_room_conflicts()
        constraint_count += self._constraint_no_class_overlap()
        constraint_count += self._constraint_fixed_rooms_and_starttime()
        constraint_count += self._constraint_same_room_for_lectures()
        constraint_count += self._constraint_practical_contiguity_and_consecutive_rules()
        constraint_count += self._constraint_room_capacity()

        # build peak-slot variables used for smoothing objective
        self._add_peak_slot_vars()

        print(f"  [OK] Added {constraint_count} constraints")

    # ----------------------
    # Named constraint methods
    # ----------------------
    def _constraint_ltp_requirements(self):
        """Enforce L/T counts and practical total hours (each practical = 2 hours)."""
        added = 0
        for cls in CLASSES:
            for course_code, course in COURSES.items():
                if course["year"] != cls["year"] or course["sem"] not in cls["sems"]:
                    continue

                # Lectures
                lect_vars = [v for (c, co, st, ts, t, r), v in self.vars.items()
                             if c == cls["id"] and co == course_code and st == "L"]
                if lect_vars:
                    self.model.Add(sum(lect_vars) == course["L"])
                    added += 1

                # Tutorials
                if course.get("T", 0) > 0:
                    tut_vars = [v for (c, co, st, ts, t, r), v in self.vars.items()
                                if c == cls["id"] and co == course_code and st == "T"]
                    if tut_vars:
                        self.model.Add(sum(tut_vars) == course["T"])
                        added += 1

                # Practicals: P is total hours (P=2 means one 2-hour block)
                if course.get("P", 0) > 0:
                    prac_vars = [v for (c, co, st, ts, t, r), v in self.vars.items()
                                 if c == cls["id"] and co == course_code and st == "P"]
                    if prac_vars:
                        self.model.Add(sum(prac_vars) == course["P"])
                        added += 1
        return added

    def _constraint_teacher_workload(self):
        """Enforce teacher min/max workload in hours."""
        added = 0
        for teacher in TEACHERS:
            teach_vars = [v for (c, co, st, ts, t, r), v in self.vars.items() if t == teacher["id"]]
            if teach_vars:
                self.model.Add(sum(teach_vars) <= teacher.get("max", 999))
                self.model.Add(sum(teach_vars) >= teacher.get("min", 0))
                added += 2
        return added

    def _constraint_no_teacher_double_booking(self):
        """No teacher can teach more than one session in the same timeslot."""
        added = 0
        for ts in TIMESLOTS:
            for teacher in TEACHERS:
                conflict_vars = [v for (c, co, st, ts_val, t, r), v in self.vars.items()
                                if ts_val == ts and t == teacher["id"]]
                if conflict_vars and len(conflict_vars) > 1:
                    self.model.Add(sum(conflict_vars) <= 1)
                    added += 1
        return added

    def _constraint_no_room_conflicts(self):
        """No room can host more than one session in the same timeslot."""
        added = 0
        for ts in TIMESLOTS:
            for room in ROOMS["theory"] + ROOMS["lab"]:
                room_vars = [v for (c, co, st, ts_val, t, r), v in self.vars.items()
                            if ts_val == ts and r == room]
                if room_vars and len(room_vars) > 1:
                    self.model.Add(sum(room_vars) <= 1)
                    added += 1
        return added

    def _constraint_no_class_overlap(self):
        """A class cannot have two sessions at the same timeslot."""
        added = 0
        for ts in TIMESLOTS:
            for cls in CLASSES:
                class_vars = [v for (c, co, st, ts_val, t, r), v in self.vars.items()
                              if ts_val == ts and c == cls["id"]]
                if class_vars and len(class_vars) > 1:
                    self.model.Add(sum(class_vars) <= 1)
                    added += 1
        return added

    def _constraint_fixed_rooms_and_starttime(self):
        """Enforce fixed theory rooms and disallow sessions before 09:00 if configured."""
        added = 0
        fixed_rooms = CONFIG.get("fixed_rooms", {})
        if fixed_rooms:
            for (c, co, st, ts, t, r), var in list(self.vars.items()):
                if st in ("L", "T") and c in fixed_rooms:
                    allowed = fixed_rooms[c]
                    if r != allowed:
                        self.model.Add(var == 0)
                        added += 1

        # enforce no sessions before 09:00
        for (c, co, st, ts, t, r), var in list(self.vars.items()):
            if '_' in ts:
                hour = ts.split('_', 1)[1]
                if hour < '09:00':
                    self.model.Add(var == 0)
                    added += 1
        return added

    def _constraint_same_room_for_lectures(self):
        """Enforce that all lecture/tutorial theory sessions of a class use the same theory room."""
        added = 0
        for cls in CLASSES:
            # collect lecture/tutorial vars by room
            lecture_vars_by_room = defaultdict(list)
            for (c, co, st, ts, t, r), var in self.vars.items():
                if c != cls["id"]:
                    continue
                if st not in ("L", "T"):
                    continue
                if r not in ROOMS["theory"]:
                    continue
                lecture_vars_by_room[r].append(var)

            if not lecture_vars_by_room:
                continue

            # create room_used vars and force exactly one
            room_used = {}
            for room in lecture_vars_by_room:
                room_used[room] = self.model.NewBoolVar(f"room_used_{cls['id']}_{room}")
                # if any lecture/tut in that room then room_used must be true
                self.model.AddMaxEquality(room_used[room], lecture_vars_by_room[room])
                added += 1

            # exactly one theory room for the class
            self.model.Add(sum(room_used.values()) == 1)
            added += 1
        return added

    def _constraint_practical_contiguity_and_consecutive_rules(self):
        """Ensure practicals are scheduled as contiguous 2-hour blocks and prevent faculty from teaching different practicals back-to-back."""
        added = 0

        # For each class+course with practicals, create pair vars for consecutive slots
        for cls in CLASSES:
            for course_code, course in COURSES.items():
                if course.get("P", 0) <= 0:
                    continue
                if course["year"] != cls["year"] or course["sem"] not in cls["sems"]:
                    continue

                pair_vars = []
                # iterate days and consecutive hour indices
                for day in DAYS:
                    for i in range(len(HOURS) - 1):
                        slot1 = f"{day}_{HOURS[i]}"
                        slot2 = f"{day}_{HOURS[i+1]}"
                        
                        # Check that slots are actually 1 hour apart (not a lunch gap)
                        h1 = int(HOURS[i].split(':')[0])
                        h2 = int(HOURS[i+1].split(':')[0])
                        if h2 - h1 != 1:
                            continue  # Skip non-consecutive hours (e.g., 12:00 to 14:00)
                        
                        for teacher in TEACHERS:
                            for room in (ROOMS["lab"] if course.get("lab", False) else ROOMS["theory"]):
                                k1 = (cls["id"], course_code, "P", slot1, teacher["id"], room)
                                k2 = (cls["id"], course_code, "P", slot2, teacher["id"], room)
                                if k1 in self.vars and k2 in self.vars:
                                    v1 = self.vars[k1]
                                    v2 = self.vars[k2]
                                    p = self.model.NewBoolVar(f"pair_{cls['id']}_{course_code}_{slot1}_{teacher['id']}_{room}")
                                    # p == v1 AND v2
                                    self.model.Add(p <= v1)
                                    self.model.Add(p <= v2)
                                    self.model.Add(p >= v1 + v2 - 1)
                                    # Store (pair_var, v1, v2, day) for filtering
                                    pair_vars.append((p, v1, v2, day))
                                    added += 3

                # Number of pairs = P/2 (each pair is a 2-hour block, P is hours)
                if pair_vars:
                    num_blocks = course.get("P", 0) // 2
                    self.model.Add(sum(p for p, v1, v2, d in pair_vars) == num_blocks)
                    added += 1

                    # ensure any practical hourly var is part of one pair
                    hourly_to_pairs = defaultdict(list)
                    for p, v1, v2, d in pair_vars:
                        hourly_to_pairs[v1].append(p)
                        hourly_to_pairs[v2].append(p)

                    for hourly_var, ps in hourly_to_pairs.items():
                        self.model.Add(hourly_var <= sum(ps))
                        added += 1

                    # At most one practical block per (class, course, day)
                    for day in DAYS:
                        day_pairs = [p for p, v1, v2, d in pair_vars if d == day]
                        if len(day_pairs) > 1:
                            self.model.Add(sum(day_pairs) <= 1)
                            added += 1

        # Prevent faculty teaching different practicals back-to-back
        # For each teacher, consider the full ordered list of slots so that
        # adjacency across day boundaries (e.g., Tue_16:00 -> Wed_09:00) is handled.
        SLOTS = [f"{d}_{h}" for d in DAYS for h in HOURS]
        for teacher in TEACHERS:
            tid = teacher["id"]
            for i in range(len(SLOTS) - 1):
                slot1 = SLOTS[i]
                slot2 = SLOTS[i + 1]
                vars1 = [(k, self.vars[k]) for k in self.vars if k[3] == slot1 and k[2] == "P" and k[4] == tid]
                vars2 = [(k, self.vars[k]) for k in self.vars if k[3] == slot2 and k[2] == "P" and k[4] == tid]
                if not vars1 or not vars2:
                    continue

                # create pair indicators for same-session overlaps
                same_pairs = []
                for (k1, v1) in vars1:
                    for (k2, v2) in vars2:
                        # same session if class, course and room match
                        if k1[0] == k2[0] and k1[1] == k2[1] and k1[5] == k2[5]:
                            p = self.model.NewBoolVar(f"sp_{k1[0]}_{k1[1]}_{slot1}_{k1[4]}_{k1[5]}")
                            self.model.Add(p <= v1)
                            self.model.Add(p <= v2)
                            self.model.Add(p >= v1 + v2 - 1)
                            same_pairs.append(p)
                            added += 3

                sum1 = sum(v for (_, v) in vars1)
                sum2 = sum(v for (_, v) in vars2)
                if same_pairs:
                    self.model.Add(sum1 + sum2 - sum(same_pairs) <= 1)
                else:
                    self.model.Add(sum1 + sum2 <= 1)
                added += 1

        return added

    def _constraint_room_capacity(self):
        """If `room_capacities` is present in CONFIG, enforce that a room assigned
        to a class must have capacity >= class strength. If mapping absent, skip."""
        added = 0
        room_caps = CONFIG.get('room_capacities', {})
        if not room_caps:
            # No capacities configured; skip enforcing
            print('  [WARN] No room_capacities in config.json — skipping capacity checks')
            return 0

        # Build class strength map
        class_strength = {c['id']: c.get('strength', 0) for c in CLASSES}

        for (c, co, st, ts, t, r), var in list(self.vars.items()):
            cap = room_caps.get(r)
            if cap is None:
                continue
            required = class_strength.get(c, 0)
            if cap < required:
                # disallow assignment
                self.model.Add(var == 0)
                added += 1

        return added

    def _constraint_break_times(self):
        """Disallow any session that overlaps configured break intervals.

        Default breaks: lunch 13:00-14:00, short break 10:30-10:45.
        This checks hourly/2-hour sessions and bans any assignment overlapping a break.
        """
        added = 0
        # breaks can be configured in CONFIG as a list of {start,end}
        default_breaks = [{"start": "13:00", "end": "14:00"}, {"start": "10:30", "end": "10:45"}]
        breaks = CONFIG.get('break_times', default_breaks)

        def to_minutes(t):
            h, m = map(int, t.split(':'))
            return h * 60 + m

        break_intervals = []
        for b in breaks:
            try:
                bs = to_minutes(b['start'])
                be = to_minutes(b['end'])
                if be > bs:
                    break_intervals.append((bs, be))
            except Exception:
                continue

        if not break_intervals:
            return 0

        # For each assignment variable, if the session would overlap any break, disallow it
        for (c, co, st, ts, t, r), var in list(self.vars.items()):
            # ts is like 'Mon_13:00'
            try:
                start_time = ts.split('_', 1)[1]
            except Exception:
                continue

            start_min = to_minutes(start_time)
            duration = 120 if st == 'P' else 60
            end_min = start_min + duration

            # if session interval [start_min, end_min) overlaps any break interval, ban
            overlap = False
            for bs, be in break_intervals:
                if not (end_min <= bs or start_min >= be):
                    overlap = True
                    break

            if overlap:
                self.model.Add(var == 0)
                added += 1

        return added
    
    def _set_objective(self):
        """Prepare teacher preference expression (not set final objective here).

        Preference objective will be used in the second stage after minimizing peak load.
        """
        rewards = []
        for teacher in TEACHERS:
            for pref_course in teacher["prefs"]:
                pref_vars = [v for (c, co, st, ts, t, r), v in self.vars.items()
                            if t == teacher["id"] and co == pref_course]
                if pref_vars:
                    rewards.append(sum(pref_vars))

        self.pref_obj = sum(rewards) if rewards else None

    def _add_peak_slot_vars(self):
        """Create integer variables for slot loads and a `max_load` var."""
        # slot load variables
        self.slot_load = {}
        max_possible = len(CLASSES) * max((COURSES[c]['L'] + COURSES[c].get('T',0) + COURSES[c].get('P',0)*2) for c in COURSES)
        for ts in TIMESLOTS:
            vars_in_slot = [v for (c, co, st, ts_val, t, r), v in self.vars.items() if ts_val == ts]
            if vars_in_slot:
                load_var = self.model.NewIntVar(0, max_possible, f"load_{ts}")
                self.model.Add(load_var == sum(vars_in_slot))
                self.slot_load[ts] = load_var

        # max load — use AddMaxEquality for proper min-max objective
        self.max_load = self.model.NewIntVar(0, max_possible, "max_load")
        if self.slot_load:
            self.model.AddMaxEquality(self.max_load, list(self.slot_load.values()))
    
    def _solve_model(self):
        """Solve the model using safe two-stage lexicographic optimization."""
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 60.0

        print(f"Solving ({len(self.vars)} variables)...")

        # Safe lexicographic: 1) minimize peak load, 2) relax and maximize preferences
        if hasattr(self, 'max_load') and self.slot_load:
            # Stage 1: minimize max_load
            self.model.Minimize(self.max_load)
            status = solver.Solve(self.model)

            if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                print("[WARN] Peak minimization infeasible. Solving with preferences only...")
                # Set new objective (overrides previous)
                if self.pref_obj is not None:
                    self.model.Maximize(self.pref_obj)
                else:
                    self.model.Minimize(0)  # dummy objective for feasibility
                solver = cp_model.CpSolver()
                solver.parameters.max_time_in_seconds = 60.0
                status = solver.Solve(self.model)
            else:
                best_max = solver.Value(self.max_load)
                print(f"[INFO] Minimal max slot load = {best_max}")

                # Stage 2: relax with <= (allow +1 slack), maximize preferences
                self.model.Add(self.max_load <= best_max + 1)

                # Set new objective (overrides previous Minimize)
                if self.pref_obj is not None:
                    self.model.Maximize(self.pref_obj)
                else:
                    self.model.Minimize(0)  # dummy objective

                solver = cp_model.CpSolver()
                solver.parameters.max_time_in_seconds = 60.0
                status = solver.Solve(self.model)

                if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                    print("[WARN] Stage 2 failed. Solving without peak constraint...")
                    if self.pref_obj is not None:
                        self.model.Maximize(self.pref_obj)
                    solver = cp_model.CpSolver()
                    solver.parameters.max_time_in_seconds = 60.0
                    status = solver.Solve(self.model)
        else:
            if self.pref_obj is not None:
                self.model.Maximize(self.pref_obj)
            status = solver.Solve(self.model)

        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            pref_score = solver.ObjectiveValue() if self.pref_obj is not None else 0
            print(f"[OK] SOLUTION FOUND (Preference Score: {pref_score:.0f})\n")

            solution = defaultdict(list)
            for (c, co, st, ts, t, r), var in self.vars.items():
                if solver.Value(var) == 1:
                    solution[c].append({
                        "course": co,
                        "type": st,
                        "slot": ts,
                        "teacher": next((te["name"] for te in TEACHERS if te["id"] == t), t),
                        "room": r
                    })

            return solution
        else:
            print("[FAIL] No solution found\n")
            return None
    
    def print_solution(self, solution):
        """Display the timetable"""
        if not solution:
            return
        
        # Save organized timetables
        self.save_class_timetable(solution)
        self.save_faculty_timetable(solution)
        
        print("\n" + "="*140)
        print("GENERATED TIMETABLE")
        print("="*140)
        
        for cls_data in CLASSES:
            cls_id = cls_data["id"]
            if cls_id not in solution:
                print(f"\n{cls_id}: (No schedule)")
                continue
            
            print(f"\n{cls_id} - Year {cls_data['year']} (Strength: {cls_data['strength']})")
            print("-"*140)
            
            by_course = defaultdict(list)
            for entry in solution[cls_id]:
                by_course[entry["course"]].append(entry)
            
            for course_code in sorted(by_course.keys()):
                course = COURSES[course_code]
                print(f"  {course_code:6} {course['name']:20} | L:{course['L']} T:{course['T']} P:{course['P']}", end="")
                
                by_type = defaultdict(list)
                for entry in by_course[course_code]:
                    by_type[entry["type"]].append(entry)
                
                print(" | ", end="")
                for stype in ["L", "T", "P"]:
                    if stype in by_type:
                        entries = sorted(by_type[stype], key=lambda x: x["slot"])
                        type_name = {"L": "Lectures", "T": "Tutorials", "P": "Practicals"}[stype]
                        schedule_str = ", ".join(f"{e['slot']}({e['teacher'][:5]},{e['room']})" 
                                               for e in entries)
                        print(f"{type_name}:[{schedule_str}] ", end="")
                print()
        
        print("\n" + "="*140)
        print("SUMMARY")
        print("="*140)
        print(f"Classes scheduled: {len(solution)}")
        total_slots = sum(len(entries) for entries in solution.values())
        print(f"Total class-hours scheduled: {total_slots}")
        
        # Teacher summary
        print(f"\nTeacher Load Distribution:")
        for teacher in TEACHERS:
            load = sum(1 for entries in solution.values() for e in entries 
                      if e["teacher"] == teacher["name"])
            print(f"  {teacher['name']:15} - {load:2} hours (req: {teacher['min']}-{teacher['max']})")
    
    def _calculate_end_time(self, start_time, session_type="L"):
        """Calculate end time (1 hour for L/T, 2 hours for P)"""
        hours, minutes = map(int, start_time.split(':'))
        # Practicals span 2 hours, lectures/tutorials span 1 hour
        hours += 2 if session_type == "P" else 1
        return f"{hours:02d}:{minutes:02d}"
    
    def save_class_timetable(self, solution):
        """Save timetable organized by class"""
        class_timetable = {}
        
        for cls_id, entries in solution.items():
            class_timetable[cls_id] = []
            
            # Organize by course and session type
            by_course = defaultdict(list)
            for entry in entries:
                by_course[entry["course"]].append(entry)
            
            for course_code in sorted(by_course.keys()):
                course = COURSES[course_code]
                for session_type in ["L", "T", "P"]:
                    sessions = [e for e in by_course[course_code] if e["type"] == session_type]
                    for session in sessions:
                        start_time = session["slot"].split("_")[1]
                        end_time = self._calculate_end_time(start_time, session_type)
                        class_timetable[cls_id].append({
                            "course": course_code,
                            "course_name": course["name"],
                            "type": session_type,
                            "day": session["slot"].split("_")[0],
                            "start_time": start_time,
                            "end_time": end_time,
                            "teacher": session["teacher"],
                            "room": session["room"]
                        })
        
        # Merge contiguous practical hourly entries into single 2-hour blocks
        def add_hours(time_str, hrs):
            h, m = map(int, time_str.split(':'))
            h += hrs
            return f"{h:02d}:{m:02d}"

        merged_timetable = {}
        for cls_id, sessions in class_timetable.items():
            # sort by day order and start time
            sorted_sessions = sorted(sessions, key=lambda x: (DAYS.index(x['day']), x['start_time']))
            merged = []
            i = 0
            while i < len(sorted_sessions):
                s = sorted_sessions[i]
                if s['type'] == 'P':
                    # try to merge with next session if it is the consecutive hour
                    if i + 1 < len(sorted_sessions):
                        n = sorted_sessions[i + 1]
                        if (n['type'] == 'P' and n['day'] == s['day'] and n['course'] == s['course']
                                and n['teacher'] == s['teacher'] and n['room'] == s['room']
                                and add_hours(s['start_time'], 1) == n['start_time']):
                            # create merged 2-hour block starting at s['start_time']
                            merged.append({
                                'course': s['course'],
                                'course_name': s.get('course_name', ''),
                                'type': 'P',
                                'day': s['day'],
                                'start_time': s['start_time'],
                                'end_time': self._calculate_end_time(s['start_time'], 'P'),
                                'teacher': s['teacher'],
                                'room': s['room']
                            })
                            i += 2
                            continue
                    # no consecutive partner found; still represent as 2-hour block
                    merged.append({
                        'course': s['course'],
                        'course_name': s.get('course_name', ''),
                        'type': 'P',
                        'day': s['day'],
                        'start_time': s['start_time'],
                        'end_time': self._calculate_end_time(s['start_time'], 'P'),
                        'teacher': s['teacher'],
                        'room': s['room']
                    })
                    i += 1
                else:
                    # lectures/tutorials are single-hour blocks
                    merged.append({
                        'course': s['course'],
                        'course_name': s.get('course_name', ''),
                        'type': s['type'],
                        'day': s['day'],
                        'start_time': s['start_time'],
                        'end_time': self._calculate_end_time(s['start_time'], s['type']),
                        'teacher': s['teacher'],
                        'room': s['room']
                    })
                    i += 1

            merged_timetable[cls_id] = merged

        # Save as JSON
        output_file = os.path.join(OUTPUT_DIR, "class_timetable.json")
        with open(output_file, 'w') as f:
            json.dump(merged_timetable, f, indent=2)

        # Save as TXT (human readable)
        txt_file = os.path.join(OUTPUT_DIR, "class_timetable.txt")
        with open(txt_file, 'w') as f:
            f.write("="*120 + "\n")
            f.write("CLASS-WISE TIMETABLE\n")
            f.write("="*120 + "\n\n")

            for cls_id in sorted(merged_timetable.keys()):
                f.write(f"\n{cls_id}\n")
                f.write("-"*120 + "\n")
                f.write(f"{ 'Day':<10} {'Start':<10} {'End':<10} {'Course':<15} {'Type':<5} {'Teacher':<20} {'Room':<10}\n")
                f.write("-"*120 + "\n")

                for session in merged_timetable[cls_id]:
                    f.write(f"{session['day']:<10} {session['start_time']:<10} {session['end_time']:<10} {session['course']:<15} "
                           f"{session['type']:<5} {session['teacher']:<20} {session['room']:<10}\n")

        print(f"[OK] Class timetable saved to: {output_file}")
        print(f"[OK] Class timetable saved to: {txt_file}")
    
    def save_faculty_timetable(self, solution):
        """Save timetable organized by faculty"""
        faculty_timetable = {t["name"]: [] for t in TEACHERS}
        
        for cls_id, entries in solution.items():
            for entry in entries:
                teacher_name = entry["teacher"]
                if teacher_name in faculty_timetable:
                    start_time = entry["slot"].split("_")[1]
                    end_time = self._calculate_end_time(start_time)
                    faculty_timetable[teacher_name].append({
                        "class": cls_id,
                        "course": entry["course"],
                        "course_name": COURSES[entry["course"]]["name"],
                        "type": entry["type"],
                        "day": entry["slot"].split("_")[0],
                        "start_time": start_time,
                        "end_time": end_time,
                        "room": entry["room"]
                    })
        
        # Save as JSON
        output_file = os.path.join(OUTPUT_DIR, "faculty_timetable.json")
        with open(output_file, 'w') as f:
            json.dump(faculty_timetable, f, indent=2)
        
        # Save as TXT (human readable)
        txt_file = os.path.join(OUTPUT_DIR, "faculty_timetable.txt")
        with open(txt_file, 'w') as f:
            f.write("="*130 + "\n")
            f.write("FACULTY-WISE TIMETABLE\n")
            f.write("="*130 + "\n")
            
            for teacher_name in sorted(faculty_timetable.keys()):
                f.write(f"\n{teacher_name}\n")
                f.write("-"*130 + "\n")
                f.write(f"{'Day':<10} {'Start':<10} {'End':<10} {'Class':<10} {'Course':<15} {'Type':<5} {'Room':<10}\n")
                f.write("-"*130 + "\n")
                
                sessions = sorted(faculty_timetable[teacher_name], 
                                key=lambda x: (x["day"], x["start_time"]))
                total_hours = len(sessions)
                
                for session in sessions:
                    f.write(f"{session['day']:<10} {session['start_time']:<10} {session['end_time']:<10} {session['class']:<10} "
                           f"{session['course']:<15} {session['type']:<5} {session['room']:<10}\n")
                
                f.write("-"*130 + "\n")
                f.write(f"Total hours: {total_hours}\n")
        
        print(f"[OK] Faculty timetable saved to: {output_file}")
        print(f"[OK] Faculty timetable saved to: {txt_file}")

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    scheduler = Scheduler()
    solution = scheduler.solve()
    
    if solution:
        scheduler.print_solution(solution)
        
        # Save solution to JSON file
        solution_file = os.path.join(OUTPUT_DIR, "solution.json")
        with open(solution_file, 'w') as f:
            # Convert defaultdict to dict for JSON serialization
            json.dump(dict(solution), f, indent=2)
        print(f"[OK] Solution saved to: {solution_file}\n")
        
        # Save class-wise timetable
        scheduler.save_class_timetable(solution)
        
        # Save faculty-wise timetable
        scheduler.save_faculty_timetable(solution)
    
    print("\n")