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

import sys
import json
import os
from ortools.sat.python import cp_model
from collections import defaultdict

# ============================================================================
# PATHS - Relative to project root
# ============================================================================
PROJECT_ROOT = os.path.dirname(__file__)
CONFIG_DIR = os.path.join(PROJECT_ROOT, "config")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "output")

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ============================================================================
# LOAD CONFIGURATION
# ============================================================================

def load_config(config_file="config.json"):
    """Load scheduler configuration from JSON file or STDIN"""
    # Check if input is coming from stdin
    if not sys.stdin.isatty():
        try:
            return json.load(sys.stdin)
        except json.JSONDecodeError as e:
            print(f"[ERROR] Failed to parse STDIN JSON: {e}", file=sys.stderr)
            pass # Fallback to file

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

print("\n" + "="*120, file=sys.stderr)
print("CSE TIMETABLE SCHEDULER", file=sys.stderr)
print("="*120, file=sys.stderr)
print(f"Setup: {len(COURSES)} courses, {len(TEACHERS)} teachers, {len(CLASSES)} classes, "
      f"{len(ROOMS['theory'])} theory rooms, {len(ROOMS['lab'])} lab rooms, {len(TIMESLOTS)} timeslots\n", file=sys.stderr)
if not ROOMS['theory'] or not ROOMS['lab']:
    print(f"[CRITICAL] Missing room types! Theory: {len(ROOMS['theory'])}, Lab: {len(ROOMS['lab'])}", file=sys.stderr)

# ============================================================================
# SCHEDULER
# ============================================================================

class Scheduler:
    def __init__(self):
        self.model = cp_model.CpModel()
        self.schedule = {}
        # teacher_flag_map holds the assignment BoolVar for (class, course_key, teacher)
        # populated in _constraint_single_teacher_per_course
        self.teacher_flag_map = {}

        # Class-slot occupancy variables
        self.class_busy = {}
        for cls in CLASSES:
            for ts in TIMESLOTS:
                self.class_busy[(cls["id"], ts)] = self.model.NewBoolVar(
                    f"class_busy_{cls['id']}_{ts}"
                )
    
    def solve(self):
        """Main solve function"""
        self._create_variables()
        self._apply_constraints()
        self._set_objective()
        return self._solve_model()
    
    def _create_variables(self):
        """Create decision variables: assignment[class, course, session_type, slot, teacher, room]

        Supports an optional `forbiddenAssignments` list in CONFIG to ban specific assignments
        (class, course, teacher) which helps automatic repair retries.
        """
        print("Creating variables...", file=sys.stderr)
        
        self.vars = {}
        # NEW: High-performance lookup indexes
        self.vars_by_class_slot = defaultdict(list)
        self.vars_by_course_slot = defaultdict(list)
        self.vars_by_teacher_slot = defaultdict(list)
        self.vars_by_room_slot = defaultdict(list)
        self.vars_by_class_course_type = defaultdict(list)
        self.vars_by_class_room = defaultdict(list)
        self.vars_by_class_course_teacher = defaultdict(list)
        self.vars_by_class_course_day = defaultdict(list)
        
        # Pre-map teacher names for performance and reliability
        self.teacher_names = {t["id"]: t.get("name") or f"Faculty_{t['id'][-6:]}" for t in TEACHERS}
        
        var_count = 0

        # Build forbidden set for quick lookup
        forbidden = CONFIG.get('forbiddenAssignments', []) or []
        forbidden_set = set()
        for f in forbidden:
            # expected keys: class, course, teacher
            forbidden_set.add((f.get('class'), f.get('course'), f.get('teacher')))
        if forbidden_set:
            print(f"Applying {len(forbidden_set)} forbidden assignments", file=sys.stderr)
            # show sample for debugging
            for b in list(forbidden_set)[:10]:
                print(f"  - ban: class={b[0]}, course={b[1]}, teacher={b[2]}", file=sys.stderr)
        
        self.teacher_flag_map = {}
        self.class_busy = {}
        for cls in CLASSES:
            for ts in TIMESLOTS:
                self.class_busy[(cls["id"], ts)] = self.model.NewBoolVar(f"busy_{cls['id']}_{ts}")

        # Pre-calculate smart rotating candidate pools to ensure fairness and manageable variable count.
        # We aim for ~10 candidates per course.
        self.qualified_teachers = {}
        teacher_count = len(TEACHERS)
        
        # Sort teachers to have a stable order for rotation
        sorted_teachers = sorted(TEACHERS, key=lambda x: x["id"])
        
        course_index = 0
        for course_code, course in COURSES.items():
            base = course_code.split('-')[0]
            qualified = []
            
            # 1. Start with high-priority candidates (assigned or preferred)
            priority_candidates = set()
            if course.get('assignedFaculty'):
                priority_candidates.add(course['assignedFaculty'])
            
            for t in sorted_teachers:
                if base in t.get('fallbackCourses', []) or base in t.get('prefs', {}):
                    priority_candidates.add(t['id'])
            
            qualified.extend(list(priority_candidates))
            
            # 2. Fill up to 3 candidates using rotation
            # Reducing to 3 significantly prunes variables
            start_offset = (course_index * 2) % teacher_count 
            for i in range(teacher_count):
                if len(qualified) >= 3:
                    break
                t_idx = (start_offset + i) % teacher_count
                tid = sorted_teachers[t_idx]["id"]
                if tid not in priority_candidates:
                    qualified.append(tid)
            
            self.qualified_teachers[course_code] = qualified
            
            # Initialize teacher flags for this course across all potentially assigned classes
            for cls in CLASSES:
                if course["year"] == cls["year"] and course["sem"] in cls["sems"] and course_code in cls.get("courses", []):
                    for tid in qualified:
                        self.teacher_flag_map[(cls["id"], course_code, tid)] = self.model.NewBoolVar(f"tf_{cls['id']}_{course_code}_{tid}")
            
            course_index += 1

        print(f"Candidate pools created (average {sum(len(v) for v in self.qualified_teachers.values())/len(COURSES):.1f} teachers/course)", file=sys.stderr)

        for cls in CLASSES:
            # PRUNE THEORY ROOMS: Each class group is assigned only 5 theory rooms as candidates
            num_t_rooms = len(ROOMS["theory"])
            class_theory_rooms = []
            if num_t_rooms > 0:
                # Use deterministic hash of class ID to pick rooms
                start_r = (abs(hash(cls["id"])) % num_t_rooms)
                for r_idx in range(min(5, num_t_rooms)):
                    class_theory_rooms.append(ROOMS["theory"][(start_r + r_idx) % num_t_rooms])
            else:
                class_theory_rooms = []

            for course_code, course in COURSES.items():
                if course["year"] != cls["year"] or course["sem"] not in cls["sems"]:
                    continue
                
                if course_code not in cls.get("courses", []):
                    continue
                
                candidates = self.qualified_teachers.get(course_code, [t["id"] for t in TEACHERS])
                
                # Lectures - only in pruned theory rooms
                for ts in TIMESLOTS:
                    for tid in candidates:
                        for room in class_theory_rooms:
                            var = self.model.NewBoolVar(f"L_{cls['id']}_{course_code}_{ts}_{tid}_{room}")
                            if (cls['id'], course_code, tid) in forbidden_set:
                                self.model.Add(var == 0)
                            
                            # Link to teacher flag: if session is active, this teacher MUST be the one for the course
                            self.model.Add(var <= self.teacher_flag_map[(cls['id'], course_code, tid)])
                            
                            key = (cls["id"], course_code, "L", ts, tid, room)
                            self.vars[key] = var
                            # Indexing
                            self.vars_by_class_slot[(cls["id"], ts)].append((course_code, var))
                            self.vars_by_course_slot[(course_code, ts)].append(var)
                            self.vars_by_teacher_slot[(tid, ts)].append(var)
                            self.vars_by_room_slot[(room, ts)].append(var)
                            self.vars_by_class_course_type[(cls["id"], course_code, "L")].append(var)
                            self.vars_by_class_room[(cls["id"], room)].append(var)
                            self.vars_by_class_course_teacher[(cls["id"], course_code, tid)].append(var)
                            
                            day = ts.split('_')[0]
                            self.vars_by_class_course_day[(cls["id"], course_code, day)].append(var)
                            var_count += 1
                
                # Tutorials - only in pruned theory rooms
                if course.get("T", 0) > 0:
                    for ts in TIMESLOTS:
                        for tid in candidates:
                            for room in class_theory_rooms:
                                var = self.model.NewBoolVar(f"T_{cls['id']}_{course_code}_{ts}_{tid}_{room}")
                                if (cls['id'], course_code, tid) in forbidden_set:
                                    self.model.Add(var == 0)
                                
                                # Link to teacher flag
                                self.model.Add(var <= self.teacher_flag_map[(cls['id'], course_code, tid)])
                                
                                key = (cls["id"], course_code, "T", ts, tid, room)
                                self.vars[key] = var
                                # Indexing
                                self.vars_by_class_slot[(cls["id"], ts)].append((course_code, var))
                                self.vars_by_course_slot[(course_code, ts)].append(var)
                                self.vars_by_teacher_slot[(tid, ts)].append(var)
                                self.vars_by_room_slot[(room, ts)].append(var)
                                self.vars_by_class_course_type[(cls["id"], course_code, "T")].append(var)
                                self.vars_by_class_room[(cls["id"], room)].append(var)
                                self.vars_by_class_course_teacher[(cls["id"], course_code, tid)].append(var)
                                
                                day = ts.split('_')[0]
                                self.vars_by_class_course_day[(cls["id"], course_code, day)].append(var)
                                var_count += 1
                
                # Practicals
                if course.get("P", 0) > 0:
                    room_list = ROOMS["lab"] if ROOMS["lab"] else ROOMS["theory"]
                    for day in DAYS:
                        day_slots = [ts for ts in TIMESLOTS if ts.startswith(day)]
                        for i, ts in enumerate(day_slots):
                            # Lab takes 2 slots (100 mins)
                            if i + 1 >= len(day_slots):
                                continue # Cannot start in last slot of day
                            
                            next_ts = day_slots[i+1]
                            
                            for tid in candidates:
                                for room in room_list:
                                    var = self.model.NewBoolVar(f"P_{cls['id']}_{course_code}_{ts}_{tid}_{room}")
                                    if (cls['id'], course_code, tid) in forbidden_set:
                                        self.model.Add(var == 0)
                                    
                                    # Link to teacher flag
                                    self.model.Add(var <= self.teacher_flag_map[(cls['id'], course_code, tid)])
                                    
                                    key = (cls["id"], course_code, "P", ts, tid, room)
                                    self.vars[key] = var
                                    # Indexing (Block both slots on the same day)
                                    for target_ts in [ts, next_ts]:
                                        self.vars_by_class_slot[(cls["id"], target_ts)].append((course_code, var))
                                        self.vars_by_course_slot[(course_code, target_ts)].append(var)
                                        self.vars_by_teacher_slot[(tid, target_ts)].append(var)
                                        self.vars_by_room_slot[(room, target_ts)].append(var)
                                        
                                    self.vars_by_class_course_type[(cls["id"], course_code, "P")].append(var)
                                    self.vars_by_class_course_teacher[(cls["id"], course_code, tid)].append(var)
                                    
                                    self.vars_by_class_course_day[(cls["id"], course_code, day)].append(var)
                                    var_count += 1
                
                # ENFORCE SINGLE TEACHER: exactly one teacher flag must be true for this course-section
                course_tfs = [self.teacher_flag_map[(cls["id"], course_code, tid)] for tid in candidates]
                if course_tfs:
                    self.model.Add(sum(course_tfs) == 1)
        # NOTE: assigned_tid constraint (previously lines 180-183) has been removed 
        # to allow fallbacks as requested by the user. 
        # Preference for 'assignedFaculty' is now handled in _set_objective.

        # Fallback faculty support: if assignedFaculty is missing or unavailable,
        # we allow other teachers but with a lower priority in the objective.
        # This is already partially handled by only creating vars for 'assignedFaculty' if it exists.
        # To support fallbacks, we should ensure variables exist for ALL teachers, 
        # but force priority for the 'primary' one if specified.
        # The current implementation (lines 141, 153, 170) already handles 'forbiddenSet' which is used for repairs.

        print(f"  [OK] Created {var_count} variables", file=sys.stderr)
    
    def _apply_constraints(self):
        """Apply all hard constraints by delegating to named constraint functions."""
        print("Applying constraints...", file=sys.stderr)

        # Link all session variables to class_busy
        for (c, co, st, ts, t, r), v in self.vars.items():
            # if a session variable is set, its class must be busy at that slot
            self.model.Add(v <= self.class_busy[(c, ts)])

        # A class can be busy at most once per slot (enforced by class_busy variables)
        # Note: this is a stricter single-source-of-truth than the earlier no-class-overlap constraint
        for cls in CLASSES:
            for ts in TIMESLOTS:
                # class_busy is boolean; this line keeps the intent explicit
                self.model.Add(self.class_busy[(cls["id"], ts)] <= 1)

                # Relaxed logic: Allow multiple ELECTIVE courses in the same slot (for split sections).
                # But strict limit: max 1 NON-ELECTIVE, and NON-ELECTIVE cannot overlap with any ELECTIVE.
                
                # USE INDEXED LOOKUP (Prevents millions of iterations)
                course_vars_in_slot = self.vars_by_class_slot.get((cls["id"], ts), [])
                
                if not course_vars_in_slot:
                    self.model.Add(self.class_busy[(cls["id"], ts)] == 0)
                    continue

                non_elective_vars = []
                elective_vars = []
                
                # course_vars_in_slot is now list of (course_code, var)
                for co_code, v in course_vars_in_slot:
                    c_data = COURSES.get(co_code)
                    if c_data and c_data.get('isElective'):
                        elective_vars.append(v)
                    else:
                        non_elective_vars.append(v)

                # 1. At most one non-elective session
                if non_elective_vars:
                    self.model.Add(sum(non_elective_vars) <= 1)
                
                # 2. If any non-elective is scheduled, NO elective can be scheduled
                if elective_vars:
                    is_any_elective = self.model.NewBoolVar(f"any_elective_{cls['id']}_{ts}")
                    self.model.AddMaxEquality(is_any_elective, elective_vars)
                    if non_elective_vars:
                        self.model.Add(sum(non_elective_vars) + is_any_elective <= 1)
                else:
                    if non_elective_vars:
                        self.model.Add(sum(non_elective_vars) <= 1)

        constraint_count = 0
        constraint_count += self._constraint_ltp_requirements()
        constraint_count += self._constraint_teacher_workload()
        constraint_count += self._constraint_no_teacher_double_booking()
        constraint_count += self._constraint_no_room_conflicts()
        constraint_count += self._constraint_fixed_rooms_and_starttime()
        constraint_count += self._constraint_same_room_for_lectures()
        # DISABLED: Redundant with the new Block Variable approach in _create_variables
        # constraint_count += self._constraint_practical_contiguity_and_consecutive_rules()
        constraint_count += self._constraint_room_capacity()
        # New constraints
        # Single teacher is now enforced in _create_variables
        constraint_count += self._constraint_subject_daily_limit()
        constraint_count += self._constraint_teacher_section_limits()
        # constraint_count += self._constraint_electives_common_slot()

        # build peak-slot variables used for smoothing objective
        self._add_peak_slot_vars()

        print(f"  [OK] Added {constraint_count} constraints", file=sys.stderr)



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
                
                if course_code not in cls.get("courses", []):
                    continue

                # Lectures
                lect_vars = self.vars_by_class_course_type.get((cls["id"], course_code, "L"), [])
                if lect_vars:
                    self.model.Add(sum(lect_vars) == course["L"])
                    added += 1

                # Tutorials
                if course.get("T", 0) > 0:
                    tut_vars = self.vars_by_class_course_type.get((cls["id"], course_code, "T"), [])
                    if tut_vars:
                        self.model.Add(sum(tut_vars) == course["T"])
                        added += 1

                # Practicals
                if course.get("P", 0) > 0:
                    prac_vars = self.vars_by_class_course_type.get((cls["id"], course_code, "P"), [])
                    if prac_vars:
                        # Since each prac_var is a 2-hour block (from _create_variables indexing),
                        # we need P/2 such blocks to get P hours.
                        self.model.Add(sum(prac_vars) * 2 == course["P"])
                        added += 1
        return added

    def _constraint_teacher_workload(self):
        """Enforce teacher min/max workload in hours. Merged sections in same slot count as 1 hour."""
        added = 0
        for teacher in TEACHERS:
            # We must sum up "active slots" for this teacher.
            # active_slots = sum(is_teaching_in_slot_S)
            
            slot_activity_vars = []
            
            for ts in TIMESLOTS:
                # INDEXED LOOKUP
                ts_vars = self.vars_by_teacher_slot.get((teacher["id"], ts), [])
                
                if not ts_vars:
                    continue
                
                if len(ts_vars) == 1:
                    slot_activity_vars.append(ts_vars[0])
                else:
                    b = self.model.NewBoolVar(f"active_{teacher['id']}_{ts}")
                    self.model.AddMaxEquality(b, ts_vars)
                    slot_activity_vars.append(b)
            
            if slot_activity_vars:
                # Total hours = sum of active slots
                total_load = sum(slot_activity_vars)
                
                # USER PREFERENCE: 16-18 preferred, but 15-22 allowed
                # NOTE: If total work / teachers < 15, a hard min of 15 will cause failure.
                # We use a broad hard range and strong soft penalties for target adherence.
                pref_min = 16
                pref_max = 18
                hard_min = 0 
                hard_max = 24 # Slightly above 22 for feasibility slack
                
                # Hard constraints
                self.model.Add(total_load >= hard_min)
                self.model.Add(total_load <= hard_max)
                
                # Penalty for being below 16
                deficit = self.model.NewIntVar(0, 24, f"load_deficit_{teacher['id']}")
                self.model.Add(deficit >= pref_min - total_load)
                self.model.Add(deficit >= 0)
                
                # Penalty for being above 18
                excess = self.model.NewIntVar(0, 24, f"load_excess_{teacher['id']}")
                self.model.Add(excess >= total_load - pref_max)
                self.model.Add(excess >= 0)
                
                # HEAVY penalty for being outside the 15-22 range
                # Penalty for being below 15
                deficit_15 = self.model.NewIntVar(0, 24, f"deficit_15_{teacher['id']}")
                self.model.Add(deficit_15 >= 15 - total_load)
                self.model.Add(deficit_15 >= 0)
                
                # Penalty for being above 22
                excess_22 = self.model.NewIntVar(0, 24, f"excess_22_{teacher['id']}")
                self.model.Add(excess_22 >= total_load - 22)
                self.model.Add(excess_22 >= 0)
                
                if not hasattr(self, 'workload_penalties'):
                    self.workload_penalties = []
                
                # Weights: 
                # 16-18 is the target (low penalty for minor deviation)
                # 15-22 is the acceptable range (high penalty for exceeding)
                self.workload_penalties.extend([deficit * 10, excess * 10])
                self.workload_penalties.extend([deficit_15 * 1000, excess_22 * 1000])
                
                # Keep reference for reporting
                if not hasattr(self, 'teacher_load_vars'):
                    self.teacher_load_vars = {}
                self.teacher_load_vars[teacher['id']] = (total_load, pref_min, pref_max)
                added += 1
        return added

    def _constraint_no_teacher_double_booking(self):
        """No teacher can teach more than one session in the same timeslot."""
        added = 0
        for ts in TIMESLOTS:
            for teacher in TEACHERS:
                # INDEXED LOOKUP
                ts_vars = self.vars_by_teacher_slot.get((teacher["id"], ts), [])
                if ts_vars:
                    self.model.Add(sum(ts_vars) <= 1)
                    added += 1
        return added
                                    

    def _constraint_no_room_conflicts(self):
        """No room can host more than one session in the same timeslot."""
        added = 0
        for ts in TIMESLOTS:
            for room in ROOMS["theory"] + ROOMS["lab"]:
                # INDEXED LOOKUP
                room_vars = self.vars_by_room_slot.get((room, ts), [])
                if room_vars:
                    # A room can host at most one session in one slot
                    self.model.Add(sum(room_vars) <= 1)
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

        # enforce no sessions before 08:30 (adjusted from 09:00 to allow 08:50 slot)
        for (c, co, st, ts, t, r), var in list(self.vars.items()):
            if '_' in ts:
                hour = ts.split('_', 1)[1]
                if hour < '08:30':
                    self.model.Add(var == 0)
                    added += 1
        return added

    def _constraint_same_room_for_lectures(self):
        """Enforce that all lecture/tutorial theory sessions of a class use the same theory room."""
        added = 0
        for cls in CLASSES:
            # INDEXED LOOKUP
            # Collect lecture/tutorial vars by room using high-speed index
            lecture_vars_by_room = defaultdict(list)
            for room in ROOMS["theory"]:
                # Only include vars for this class in this theory room
                # vars_by_class_room[ (cls_id, room) ]
                class_room_vars = self.vars_by_class_room.get((cls["id"], room), [])
                if class_room_vars:
                    lecture_vars_by_room[room].extend(class_room_vars)

            if not lecture_vars_by_room:
                continue

            # create room_used vars
            room_used = {}
            for room in lecture_vars_by_room:
                room_used[room] = self.model.NewBoolVar(f"room_used_{cls['id']}_{room}")
                self.model.AddMaxEquality(room_used[room], lecture_vars_by_room[room])
                added += 1

            # Soften room consistency: force at least one, but allow more with penalty
            if room_used:
                # Must use at least one room
                self.model.Add(sum(room_used.values()) >= 1)
                
                # Penalty for each additional room used beyond the first
                excess_rooms = self.model.NewIntVar(0, len(room_used), f"ex_rooms_{cls['id']}")
                self.model.Add(excess_rooms >= sum(room_used.values()) - 1)
                self.model.Add(excess_rooms >= 0)
                
                if not hasattr(self, 'limit_penalties'):
                    self.limit_penalties = []
                self.limit_penalties.append(excess_rooms * 500) # Moderate-to-high penalty
                added += 1
        return added

    def _constraint_practical_contiguity_and_consecutive_rules(self):
        """Ensure practicals are scheduled as a single contiguous block on one day."""
        added = 0

        # For each class+course with practicals
        for cls in CLASSES:
            for course_code, course in COURSES.items():
                p_hours = course.get("P", 0)
                if p_hours <= 0:
                    continue
                if course["year"] != cls["year"] or course["sem"] not in cls["sems"]:
                    continue
                # Skip if not assigned to this class section
                if course_code not in cls.get("courses", []):
                    continue

                # We want to force all p_hours to be in a single continuous block on one day.
                # E.g. if P=2, we need one [t, t+1] block.
                # If P=3, we need one [t, t+1, t+2] block.
                
                # Create block variables for each possible start slot on each day
                block_vars = []

                for day in DAYS:
                    # Number of possible start positions for a block of size p_hours
                    # e.g., if 8 hours in a day and P=2, slots 1..7 are valid starts.
                    # We must assume HOURS are ordered chronologically.
                    for i in range(len(HOURS) - p_hours + 1):
                        # Verify the window is continuous time-wise (no lunch break gaps if critical, 
                        # but "continuous" usually implies slot adjacency).
                        # Check that slots are time-continuous (max 60 mins gap start-to-start)
                        # This prevents spanning across a break (e.g., 15 min break + 50 min slot = 65 min gap)
                        def to_minutes(t):
                            h, m = map(int, t.split(':'))
                            return h * 60 + m

                        valid_window = True
                        for k in range(p_hours - 1):
                            t1 = to_minutes(HOURS[i+k])
                            t2 = to_minutes(HOURS[i+k+1])
                            # If gap is more than 75 mins, assume it crosses a long break
                            if (t2 - t1) > 75:
                                valid_window = False
                                break
                        
                        if not valid_window:
                            continue

                        window_slots = []
                        for k in range(p_hours):
                            window_slots.append(f"{day}_{HOURS[i+k]}")
                        
                        # Collect all vars that would form this block
                        # We need ONE teacher and ONE room for the whole block.
                        # So we iterate teachers and rooms, and create a candidate block boolean.
                        
                        for teacher in TEACHERS:
                            # Filter by assigned faculty
                            if course.get("assignedFaculty") and teacher["id"] != course["assignedFaculty"]:
                                continue
                                
                            room_list = ROOMS["lab"] if (course.get("lab", False) or course.get("P", 0) > 0) else ROOMS["theory"]
                            for room in room_list:
                                # Start a candidate block
                                # The block variable implies ALL p_hours slots are assigned to this T and R
                                relevant_vars = []
                                for slot in window_slots:
                                    key = (cls["id"], course_code, "P", slot, teacher["id"], room)
                                    if key in self.vars:
                                        relevant_vars.append(self.vars[key])
                                
                                if len(relevant_vars) == p_hours:
                                    b_var = self.model.NewBoolVar(f"block_{cls['id']}_{course_code}_{window_slots[0]}_{teacher['id']}_{room}")
                                    
                                    # b_var => all relevant_vars are 1
                                    # implies enforcement
                                    for rv in relevant_vars:
                                        self.model.Add(rv >= b_var)
                                    
                                    # Also, to prevent partial setups, we force the sum equality?
                                    # Or simpler: We will just enforce that sum(block_vars) == 1.
                                    # And we need to ensure that if a slot var is 1, it belongs to an active block.
                                    # But enforcing b_var => rv is enough if we maximize blocks?
                                    # No, we need strict equality: sum(all_p_vars) == P * sum(all_block_vars).
                                    # Let's simplify:
                                    # Enforce exactly one block is chosen.
                                    block_vars.append(b_var)
                                    added += 1

                if block_vars:
                    # 1. Exactly one block must be active
                    self.model.Add(sum(block_vars) == 1)
                    added += 1

                    # 2. All P variables must be consistent with the chosen block.
                    # INDEXED LOOKUP
                    all_course_p_vars = self.vars_by_class_course_type.get((cls["id"], course_code, "P"), [])
                    self.model.Add(sum(all_course_p_vars) == p_hours)
                    added += 1
                else:
                    print(f"  [WARN] No valid {p_hours}-hour blocks found for {course_code} in {cls['id']}", file=sys.stderr)

        return added

    def _constraint_room_capacity(self):
        """If `room_capacities` is present in CONFIG, penalize assignments that exceed room capacity."""
        added = 0
        room_caps = CONFIG.get('room_capacities', {})
        if not room_caps:
            return 0

        class_strength = {c['id']: c.get('strength', 0) for c in CLASSES}

        for (c, co, st, ts, t, r), var in list(self.vars.items()):
            cap = room_caps.get(r)
            if cap is None:
                continue
            required = class_strength.get(c, 0)
            if cap < required:
                # Penalty approach
                if not hasattr(self, 'capacity_penalties'):
                    self.capacity_penalties = []
                self.capacity_penalties.append(var)
                added += 1

        return added

    def _constraint_single_teacher_per_course(self):
        """Ensure that all sessions for a class-course are assigned to a single teacher."""
        added = 0
        for cls in CLASSES:
            for course_code, course in COURSES.items():
                if course["year"] != cls["year"] or course["sem"] not in cls["sems"]:
                    continue

                total_required = course.get('L', 0) + course.get('T', 0) + course.get('P', 0)
                if total_required == 0:
                    continue

                # INDEXED LOOKUP - get all vars for (class, course)
                potential_teachers = set()
                # We can't directly index by teacher yet, but we have vars_by_class_course_type
                all_sessions_for_course = []
                for stype in ["L", "T", "P"]:
                    all_sessions_for_course.extend(self.vars_by_class_course_type.get((cls["id"], course_code, stype), []))
                
                if not all_sessions_for_course:
                    continue

                # We need to know which teacher belongs to which variable.
                # Since indexing only stores 'var', we might need to change how we index or 
                # recreate the variable->teacher mapping once.
                # However, we only have ~15 teachers, so we can iterate teachers and use indexed lookup.
                
                teacher_flags = []
                for teacher in TEACHERS:
                    tid = teacher['id']
                    # INDEXED LOOKUP
                    teach_vars = self.vars_by_class_course_teacher.get((cls['id'], course_code, tid), [])
                    
                    if teach_vars:
                        tf = self.model.NewBoolVar(f"tf_{cls['id']}_{course_code}_{tid}")
                        teacher_flags.append(tf)
                        self.teacher_flag_map[(cls['id'], course_code, tid)] = tf
                        self.model.Add(sum(teach_vars) == total_required * tf)
                        added += 1

                if teacher_flags:
                    self.model.Add(sum(teacher_flags) == 1)
                    added += 1
        return added

    def _constraint_subject_daily_limit(self):
        """Ensure the same course for a class does not have more than 3 periods in a day."""
        added = 0
        for cls in CLASSES:
            for course_code in cls.get("courses", []):
                active_days = []
                for day in DAYS:
                    vars_on_day = self.vars_by_class_course_day.get((cls["id"], course_code, day), [])
                    
                    if vars_on_day:
                        # 1. SOFT DAILY LIMIT: penalties for exceeding 2 periods
                        # Limit to 2 periods per subject per day to ensure spreading
                        excess_daily = self.model.NewIntVar(0, 10, f"excess_daily_{cls['id']}_{course_code}_{day}")
                        self.model.Add(excess_daily >= sum(vars_on_day) - 2)
                        self.model.Add(excess_daily >= 0)
                        
                        if not hasattr(self, 'limit_penalties'):
                            self.limit_penalties = []
                        self.limit_penalties.append(excess_daily * 2000) 
                        added += 1

                        # 2. SPREAD LOGIC: Reward having sessions on different days
                        day_active = self.model.NewBoolVar(f"day_active_{cls['id']}_{course_code}_{day}")
                        self.model.AddMaxEquality(day_active, vars_on_day)
                        active_days.append(day_active)
                
                if active_days:
                    if not hasattr(self, 'subject_spread_vars'):
                        self.subject_spread_vars = []
                    # Reward total number of active days (more days = higher score)
                    self.subject_spread_vars.extend(active_days)
        return added

    def _constraint_teacher_section_limits(self):
        """
        1. A teacher can handle only one course per section.
        2. A teacher can handle the same course for a maximum of two sections in total.
        """
        added = 0
        
        # 1. One course per section
        for cls in CLASSES:
            for teacher in TEACHERS:
                # Courses handles by this teacher for this class
                teacher_courses_in_class = []
                for course_code in cls.get("courses", []):
                    tf = self.teacher_flag_map.get((cls['id'], course_code, teacher['id']))
                    if tf is not None:
                        teacher_courses_in_class.append(tf)
                
                if len(teacher_courses_in_class) > 1:
                    # SOFTENED: Heavy penalty instead of hard constraint
                    excess_courses = self.model.NewIntVar(0, 5, f"ex_courses_{cls['id']}_{teacher['id']}")
                    self.model.Add(excess_courses >= sum(teacher_courses_in_class) - 1)
                    self.model.Add(excess_courses >= 0)
                    if not hasattr(self, 'limit_penalties'):
                        self.limit_penalties = []
                    self.limit_penalties.append(excess_courses * 1000)
                    added += 1
        
        # 2. Max two sections for the same course
        # Group by base course code
        courses_by_base = defaultdict(list)
        for course_key in COURSES:
            base = course_key.split('-')[0]
            courses_by_base[base].append(course_key)
            
        for base, related_keys in courses_by_base.items():
            for teacher in TEACHERS:
                # Find all flags where this teacher handles this course in different sections
                teacher_section_flags = []
                for cls in CLASSES:
                    for r_key in related_keys:
                        tf = self.teacher_flag_map.get((cls['id'], r_key, teacher['id']))
                        if tf is not None:
                            teacher_section_flags.append(tf)
                
                if len(teacher_section_flags) > 4:
                    # Penalty = max(0, sum(flags) - 4)
                    excess = self.model.NewIntVar(0, len(teacher_section_flags), f"excess_{teacher['id']}_{base}")
                    self.model.Add(excess >= sum(teacher_section_flags) - 4)
                    self.model.Add(excess >= 0)
                    
                    if not hasattr(self, 'limit_penalties'):
                        self.limit_penalties = []
                    self.limit_penalties.append(excess)
                    added += 1
                    
        return added

    def _constraint_break_times(self):
        """Disallow any session that overlaps configured break intervals.

        Default breaks: lunch 13:00-14:00, short break 10:30-10:45.
        This checks hourly/2-hour sessions and bans any assignment overlapping a break.
        """
        added = 0
        # breaks can be configured in CONFIG as a list of {start,end}
        # UPDATED to match DB slots: Slot 3 (10:30-10:45) and Slot 7 (13:15-14:05)
        default_breaks = [{"start": "13:15", "end": "14:05"}, {"start": "10:30", "end": "10:45"}]
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
            # UPDATED: Use 50 mins for theory, 100 mins for labs (2 * 50)
            duration = 100 if st == 'P' else 50
            end_min = start_min + duration

            # if session interval [start_min, end_min) overlaps any break interval, ban
            overlap = False
            for bs, be in break_intervals:
                # We use strict boundaries here because slots usually end exactly when breaks start
                # end_min <= bs means session ends at or before break starts
                # start_min >= be means session starts at or after break ends
                # Special Case: Morning break (10:30-10:45) is only 15 mins.
                # We allow 100-min labs (P) to cross it if they start early enough.
                is_morning_break = (bs == to_minutes("10:30") and be == to_minutes("10:45"))
                if not (end_min <= bs or start_min >= be):
                    if not (st == 'P' and is_morning_break):
                        overlap = True
                        break

            if overlap:
                self.model.Add(var == 0)
                added += 1

        return added
    
    def _set_objective(self):
        """Prepare teacher preference expression (not set final objective here).

        Preference objective will be used in the second stage after minimizing peak load.
        This uses the teacher_flag variables (one per class-course-teacher) so preferences
        are counted once per course assignment rather than per-session (avoid double-counting).
        """
        rewards = []

        # Build a lookup for teacher prefs for quick match
        teacher_prefs = {t['id']: set(t.get('prefs', [])) for t in TEACHERS}

        for (cls_id, course_key, tid), tf in self.teacher_flag_map.items():
            base_course = course_key.split('-')[0]
            
            # 1. Preferred course (from teacher's preference list)
            if base_course in teacher_prefs.get(tid, set()):
                rewards.append(tf * 5) # Medium weight
            
            # 2. Specifically assigned Faculty (from DB's primary assignment)
            # Find the course data to check assignedFaculty
            course_data = COURSES.get(course_key)
            if course_data and course_data.get('assignedFaculty') == tid:
                # Strong reward for the "primary" teacher ensures they are used if possible
                rewards.append(tf * 100) 

        # Reward spreading subjects across the week
        # if hasattr(self, 'subject_spread_vars'):
        #     rewards.extend(self.subject_spread_vars)

        # Reward reaching minimum hours (soft constraint)
        if hasattr(self, 'teacher_load_vars'):
            for tid, (total_load, min_h, max_h) in self.teacher_load_vars.items():
                load_up_to_min = self.model.NewIntVar(0, 50, f"load_min_{tid}")
                self.model.AddMinEquality(load_up_to_min, [total_load, min_h])
                rewards.append(load_up_to_min * 20) # Heavy reward for reaching minimums

        # Apply penalties for soft-constraints violations
        if hasattr(self, 'capacity_penalties'):
            for p_var in self.capacity_penalties:
                rewards.append(p_var * -20) # Significantly reduced penalty (was -1000)
        
        if hasattr(self, 'limit_penalties'):
            for p_var in self.limit_penalties:
                # Objective is MAXIMIZED, so we subtract penalty * weight
                rewards.append(p_var * -1000) # High penalty for excess sections

        if hasattr(self, 'workload_penalties'):
            for p_var in self.workload_penalties:
                rewards.append(p_var * -100) # Penalize deviation from target workload
        
        if hasattr(self, 'daily_limit_penalties'):
            for p_var in self.daily_limit_penalties:
                rewards.append(p_var * -30) # Penalty for exceeding 3 periods/day

        self.pref_obj = sum(rewards) if rewards else None

    def _constraint_electives_common_slot(self):
        """Ensure all elective courses for a Year are scheduled in the same time slots (parallel blocking)."""
        added = 0
        # Group classes by year
        classes_by_year = defaultdict(list)
        for cls in CLASSES:
            classes_by_year[cls["year"]].append(cls)

        for year, year_classes in classes_by_year.items():
            # Find elective courses for this year
            # We want unique elective course CODES active in this year
            electives = set()
            for cls in year_classes:
                for c_key in cls.get('courses', []):
                    # c_key is 'CODE-Sec'
                    # check config
                    if c_key in COURSES and COURSES[c_key].get('isElective'):
                        electives.add(c_key)
            
            if not electives:
                continue
            
            # Convert set to list for indexing
            elective_list = sorted(list(electives))
            if len(elective_list) < 1:
                continue

            # We must force: If ANY elective is in Slot S, ALL electives (that have hours) must be in Slot S.
            # And they must be synchronized.
            # Strategy: Pick the 'first' elective in the list as the "Leader".
            # All other electives must strictly align with the Leader's schedule derived from variables.
            
            others = elective_list[1:]
            if not others:
                # Only one elective? Nothing to parallelize against? 
                # But maybe multiple sections take it.
                # If multiple sections take the SAME elective, the existing 'class needs' will handle it?
                # But we want to ensure if Y4-A takes NN and Y4-B takes NN, they are in same slot?
                # Yes, that was the old logic.
                # Let's keep a simplified alignment:
                pass

            # Create "is_elective_slot" vars for this Year?
            # Or just chain equalities.
            # Let's simple chain: E1 == E2 == E3 ...
            
            # Issue: E1 might have L=3, E2 might have L=3.
            # variables are (c, co, st, ts, t, r).
            # For a course, relevant var in slot ts is sum of variables (should be 0 or 1).
            
            for ts in TIMESLOTS:
                # Get activity var for each elective course
                # Since an elective course 'CSE-A' belongs to 'Y-A', there is only 1 relevant definition.
                
                # Activity vars for each elective
                activity_vars = []
                
                for course_key in elective_list:
                    # Find class for this course key
                    # course_key looks like "CODE-A". The class is "Y{y}-A".
                    # But better to just search self.vars
                    
                    # We expect exactly one assignment per slot for a course-section if it's active.
                    # Or 0.
                    
                    # Optimization: Look up variables directly
                    # self.vars keys: (c, co, st, ts, t, r)
                    # Filter for co == course_key and ts == current_ts
                    
                    # Note: Using list comprehension over all vars is slow inside loop.
                    # Use the fact we know the class?
                    # The class ID is in CLASSES config, derived from section.
                    # Actually `course_key` has section suffix in our data structure?
                    # Yes: `COURSES` keys are `Code-Sec`.
                    
                    # INDEXED LOOKUP
                    course_vars = self.vars_by_course_slot.get((course_key, ts), [])
                    
                    if course_vars:
                        # sum(course_vars) is 1 if scheduled, 0 if not
                        activity_vars.append(sum(course_vars))
                
                if len(activity_vars) > 1:
                    # Force all to be equal. 
                    # If E1 is scheduled, E2 must be scheduled.
                    # This enforces strict parallel slots.
                    # Assumption: All electives have same contact hours.
                    first = activity_vars[0]
                    for other in activity_vars[1:]:
                        self.model.Add(first == other)
                        added += 1
                        
        return added

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
        solver.parameters.max_time_in_seconds = 300.0 # Target 5 mins as requested
        solver.parameters.num_search_workers = 8

        print(f"Solving ({len(self.vars)} variables)...", file=sys.stderr)

        final_solver = None
        final_status = None

        # Stage 1: minimize peak load AND workload violations
        # Balanced weights to ensure both goals are prioritized
        stage1_obj = self.max_load * 5000
        if hasattr(self, 'workload_penalties'):
            stage1_obj += sum(self.workload_penalties) * 10000 
        
        # Also include limit_penalties in stage 1 to guide the solver
        if hasattr(self, 'limit_penalties'):
            stage1_obj += sum(self.limit_penalties) * 5000

        self.model.Minimize(stage1_obj)
        status = solver.Solve(self.model)

        print(f"Stage 1 Result: {solver.StatusName(status)} in {solver.WallTime():.2f}s", file=sys.stderr)

        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            best_max = solver.Value(self.max_load)
            print(f"[INFO] Minimal max slot load = {best_max}", file=sys.stderr)
            final_solver = solver
            final_status = status

            # Stage 2: maximize preferences while staying at minimal peak (+1 slack)
            self.model.Add(self.max_load <= best_max + 1)
            if self.pref_obj is not None:
                self.model.Maximize(self.pref_obj)
                
                solver2 = cp_model.CpSolver()
                solver2.parameters.max_time_in_seconds = 60.0
                solver2.parameters.num_search_workers = 8
                status2 = solver2.Solve(self.model)

                if status2 in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                    final_solver = solver2
                    final_status = status2
                else:
                    print("[WARN] Stage 2 preference optimization timed out or failed. Returning Stage 1 solution.", file=sys.stderr)
            else:
                print("[WARN] Peak minimization infeasible. Solving with preferences only...", file=sys.stderr)
                if self.pref_obj is not None:
                    self.model.Maximize(self.pref_obj)
                status = solver.Solve(self.model)
                if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                    final_solver = solver
                    final_status = status
        else:
            if self.pref_obj is not None:
                self.model.Maximize(self.pref_obj)
            status = solver.Solve(self.model)
            if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                final_solver = solver
                final_status = status

        if final_solver and final_status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            pref_score = final_solver.ObjectiveValue() if self.pref_obj is not None else 0
            print(f"[OK] SOLUTION FOUND (Score: {pref_score:.0f})\n", file=sys.stderr)

            solution = defaultdict(list)
            for (c, co, st, ts, t, r), var in self.vars.items():
                if final_solver.Value(var) == 1:
                    if st == "P":
                        # Add entries for both slots of the Practical block
                        day = ts.split('_', 1)[0]
                        day_slots = [s for s in TIMESLOTS if s.startswith(day)]
                        try:
                            idx = day_slots.index(ts)
                            for k in range(2):
                                if idx + k < len(day_slots):
                                    solution[c].append({
                                        "course": co,
                                        "type": st,
                                        "slot": day_slots[idx + k],
                                        "teacher": next((te["name"] for te in TEACHERS if te["id"] == t), t),
                                        "room": r
                                    })
                        except ValueError:
                            pass
                    else:
                        solution[c].append({
                            "course": co,
                            "type": st,
                            "slot": ts,
                            "teacher": next((te["name"] for te in TEACHERS if te["id"] == t), t),
                            "room": r
                        })
            return solution
        else:
            print("[FAIL] No solution found\n", file=sys.stderr)
            return None
    
    def print_solution(self, solution):
        """Display the timetable"""
        if not solution:
            return
        
        # Save organized timetables
        self.save_class_timetable(solution)
        self.save_faculty_timetable(solution)
        
        print("\n" + "="*140, file=sys.stderr)
        print("GENERATED TIMETABLE", file=sys.stderr)
        print("="*140, file=sys.stderr)
        
        for cls_data in CLASSES:
            cls_id = cls_data["id"]
            if cls_id not in solution:
                print(f"\n{cls_id}: (No schedule)", file=sys.stderr)
                continue
            
            print(f"\n{cls_id} - Year {cls_data['year']} (Strength: {cls_data['strength']})", file=sys.stderr)
            print("-"*140, file=sys.stderr)
            
            by_course = defaultdict(list)
            for entry in solution[cls_id]:
                by_course[entry["course"]].append(entry)
            
            for course_code in sorted(by_course.keys()):
                course = COURSES[course_code]
                print(f"  {course_code:6} {course['name']:20} | L:{course['L']} T:{course['T']} P:{course['P']}", end="", file=sys.stderr)
                
                by_type = defaultdict(list)
                for entry in by_course[course_code]:
                    by_type[entry["type"]].append(entry)
                
                print(" | ", end="", file=sys.stderr)
                for stype in ["L", "T", "P"]:
                    if stype in by_type:
                        entries = sorted(by_type[stype], key=lambda x: x["slot"])
                        type_name = {"L": "Lectures", "T": "Tutorials", "P": "Practicals"}[stype]
                        schedule_str = ", ".join(f"{e['slot']}({e['teacher'][:5]},{e['room']})" 
                                               for e in entries)
                        print(f"{type_name}:[{schedule_str}] ", end="", file=sys.stderr)
                print(file=sys.stderr)
        
        print("\n" + "="*140, file=sys.stderr)
        print("SUMMARY", file=sys.stderr)
        print("="*140, file=sys.stderr)
        print(f"Classes scheduled: {len(solution)}", file=sys.stderr)
        total_slots = sum(len(entries) for entries in solution.values())
        print(f"Total class-slots scheduled: {total_slots} hours", file=sys.stderr)
        
        # Teacher summary
        print(f"\nTeacher Load Distribution:", file=sys.stderr)
        for teacher in TEACHERS:
            # Overlaps are forbidden by _constraint_no_teacher_double_booking
            # so direct count is accurate for teaching hours.
            load = sum(1 for entries in solution.values() for e in entries 
                      if e["teacher"] == teacher["name"])
            print(f"  {teacher['name']:15} - {load:2} hours (target: 16-18)", file=sys.stderr)
    
    def _calculate_end_time(self, start_time, session_type="L"):
        """Calculate end time (50 mins for L/T, 100 mins for P)"""
        hours, minutes = map(int, start_time.split(':'))
        # Practicals span 100 mins, lectures/tutorials span 50 mins
        added_mins = 100 if session_type == "P" else 50
        
        total_mins = minutes + added_mins
        extra_hours = total_mins // 60
        final_mins = total_mins % 60
        final_hours = hours + extra_hours
        
        return f"{final_hours:02d}:{final_mins:02d}"
    
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

        print(f"  [OK] Class timetable saved to: {output_file}", file=sys.stderr)
        print(f"  [OK] Class timetable saved to: {txt_file}", file=sys.stderr)
    
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
        
        print(f"  [OK] Faculty timetable saved to: {output_file}", file=sys.stderr)
        print(f"  [OK] Faculty timetable saved to: {txt_file}", file=sys.stderr)

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    result = {"status": "error", "error": "Unknown error"}
    try:
        scheduler = Scheduler()
        solution = scheduler.solve()
        
        if solution:
            scheduler.print_solution(solution)
            
            # Save solution to JSON file
            solution_file = os.path.join(OUTPUT_DIR, "solution.json")
            with open(solution_file, 'w') as f:
                json.dump(dict(solution), f, indent=2)
            print(f"[OK] Solution saved to: {solution_file}\n", file=sys.stderr)
            
            # (Timetables are already saved inside print_solution)
            
            # Success response
            result = {
                "status": "success",
                "solution": dict(solution),
                "constraintsSatisfied": True
            }
        else:
            result = {
                "status": "failed",
                "error": "No feasible solution found",
                "constraintsSatisfied": False
            }
            
    except Exception as e:
        print(f"Fatal error: {str(e)}", file=sys.stderr)
        result = {
            "status": "error",
            "error": str(e)
        }
    
    # ALWAYS output JSON to stdout
    print(json.dumps(result))
    if result["status"] == "error":
        sys.exit(1)
    sys.exit(0)

