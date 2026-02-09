# Scheduler Test Cases - Expected Outputs

This document describes all test cases for `scheduler.py` and their expected outputs.

---

## Test Case 1: Basic Scheduling (`test_case_1_basic.json`)

**Constraints Tested:**
- LTP requirements (correct lecture/tutorial/practical hours)
- No teacher double-booking
- No room conflicts

**Expected Output:**
```json
{
  "status": "success",
  "solution": {
    "Y1-A": [
      // CS101-A: Exactly 3 Lectures, 1 Tutorial, 2 Practicals
      // CS102-A: Exactly 3 Lectures, 0 Tutorials, 2 Practicals
    ]
  },
  "constraintsSatisfied": true
}
```

**Validation Criteria:**
- ✅ Total L/T/P hours match course definition
- ✅ No teacher appears in two slots simultaneously
- ✅ No room used by two sessions at same time
- ✅ Practicals only in LAB rooms, Lectures in theory rooms

---

## Test Case 2: Teacher Workload (`test_case_2_teacher_workload.json`)

**Constraints Tested:**
- Teacher min/max workload (8-20 hours soft, 25 hard max)
- Single teacher per course
- Teacher preferences

**Expected Output:**
```json
{
  "status": "success",
  "solution": { ... },
  "constraintsSatisfied": true
}
```

**Validation Criteria:**
- ✅ Each teacher has between 8-25 hours (hard limits)
- ✅ Each teacher has between 8-20 hours (soft preference)
- ✅ All sessions of one class-course assigned to SAME teacher
- ✅ Teachers with preferences for courses get priority

---

## Test Case 3: Practical Contiguity (`test_case_3_practical_contiguity.json`)

**Constraints Tested:**
- Practicals scheduled as contiguous 2-hour blocks
- Same day, teacher, and lab for practical block

**Expected Output:**
```json
{
  "status": "success",
  "solution": {
    "Y3-A": [
      // CS301: P slots at consecutive times (e.g., 09:00, 10:00)
      // CS302: P slots at consecutive times on SAME day
    ]
  }
}
```

**Validation Criteria:**
- ✅ All P sessions are consecutive (e.g., 09:00 + 10:00)
- ✅ P sessions are on the SAME day
- ✅ Same teacher and same lab for both P hours
- ✅ Gap between consecutive slots ≤ 60 minutes

---

## Test Case 4: Electives Parallel (`test_case_4_electives_parallel.json`)

**Constraints Tested:**
- All electives for same year scheduled in common slots
- Parallel blocking for elective courses

**Expected Output:**
```json
{
  "status": "success",
  "solution": {
    "Y4-A": [
      // ELEC1, ELEC2, ELEC3 all scheduled in SAME time slots
      // e.g., all have L at Monday_09:00, Monday_10:00, etc.
    ]
  }
}
```

**Validation Criteria:**
- ✅ All elective L sessions occur at identical time slots
- ✅ All elective T sessions occur at identical time slots
- ✅ Non-elective courses (CS401) scheduled independently
- ✅ Different teachers but same time allows parallel classes

---

## Test Case 5: Room Constraints (`test_case_5_room_constraints.json`)

**Constraints Tested:**
- Room capacity matching class strength
- Same theory room for all lectures of a class

**Expected Output:**
```json
{
  "status": "success",
  "solution": {
    "Y1-A": [
      // All L and T sessions use SAME room (LARGE-70)
      // Capacity 70 >= strength 60
    ],
    "Y1-B": [
      // All L and T sessions use SAME room (MED-50 or LARGE-70)
      // Capacity >= strength 45
    ]
  }
}
```

**Validation Criteria:**
- ✅ Y1-A (60 students) → room with capacity ≥ 60
- ✅ Y1-B (45 students) → room with capacity ≥ 45
- ✅ All L/T sessions of ONE class use the SAME theory room
- ✅ Undercapacity rooms avoided or penalized

---

## Test Case 6: Daily Subject Limit (`test_case_6_daily_subject_limit.json`)

**Constraints Tested:**
- Max 3 periods per subject per day (soft constraint)
- Subject spread across week

**Expected Output:**
```json
{
  "status": "success",
  "solution": {
    "Y2-A": [
      // CS601 (L=5, T=1, P=2) spread across 3+ days
      // No MORE than 3 CS601 sessions on any single day
    ]
  }
}
```

**Validation Criteria:**
- ✅ No course has > 3 sessions on same day (soft limit)
- ✅ Sessions distributed across multiple days
- ✅ Minor violations penalized but allowed

---

## Test Case 7: Teacher Section Limits (`test_case_7_teacher_section_limits.json`)

**Constraints Tested:**
- Teacher can handle only 1 course per section
- Teacher can handle same course for max 2 sections

**Expected Output:**
```json
{
  "status": "success",
  "solution": {
    "Y3-A": [ /* CS701-A taught by T1 or T3 */ ],
    "Y3-B": [ /* CS701-B taught by same or different teacher */ ],
    "Y3-C": [ /* CS701-C - if T1 teaches A and B, T3 must teach C */ ]
  }
}
```

**Validation Criteria:**
- ✅ Each teacher handles at most 1 course per section
- ✅ For same base course (CS701), teacher handles max 2 sections
- ✅ Third section (CS701-C) must be assigned to different teacher
- ✅ Penalties applied for exceeding limits

---

## Test Case 8: Assigned Faculty (`test_case_8_assigned_faculty.json`)

**Constraints Tested:**
- Courses with assignedFaculty prefer that teacher
- Fallback support if primary unavailable

**Expected Output:**
```json
{
  "status": "success",
  "solution": {
    "Y4-A": [
      // CS801-A sessions assigned to T1 (Prof. Graphics)
      // CS802-A sessions assigned to T2 (Prof. Games)
    ]
  }
}
```

**Validation Criteria:**
- ✅ CS801-A assigned to T1 (assignedFaculty)
- ✅ CS802-A assigned to T2 (assignedFaculty)
- ✅ Preference score rewards using assigned faculty (+100)
- ✅ Fallback teachers available if needed

---

## Test Case 9: Edge Case - Tight Resources (`test_case_9_edge_tight_resources.json`)

**Constraints Tested:**
- Resource saturation (single teacher, single room)
- Constraint relaxation under pressure
- Error handling

**Expected Output (One of):**

**Option A - Infeasible:**
```json
{
  "status": "failed",
  "error": "No feasible solution found",
  "constraintsSatisfied": false
}
```

**Option B - Relaxed Solution:**
```json
{
  "status": "success",
  "solution": { ... },
  "constraintsSatisfied": true,
  // Some soft constraints may be violated
  // Teacher may work ~35 hours (exceeding 25 hard limit may cause failure)
}
```

**Validation Criteria:**
- Total required: 5 courses × (4L + 1T + 2P) = 35 session-hours
- Available: 5 days × 7 hours = 35 slots (exactly matches!)
- ⚠️ Teacher workload 35 hours exceeds hard max 25 → likely INFEASIBLE
- ✅ Scheduler should detect and report infeasibility

---

## How to Run Tests

```bash
cd python-scheduler

# Run individual test
python scheduler.py < test_cases/test_case_1_basic.json

# Or use the test runner script
python run_tests.py
```

---

## Constraint Summary Table

| Test Case | Constraints Covered |
|-----------|---------------------|
| 1 | LTP requirements, No double-booking, No room conflicts |
| 2 | Teacher workload, Single teacher per course |
| 3 | Practical contiguity (2hr blocks) |
| 4 | Electives parallel scheduling |
| 5 | Room capacity, Same theory room |
| 6 | Daily subject limit (≤3) |
| 7 | Teacher section limits (1 course/section, ≤2 sections) |
| 8 | Assigned faculty preference |
| 9 | Edge case - resource saturation |
