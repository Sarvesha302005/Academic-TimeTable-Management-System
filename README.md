# Timetable Scheduler

Constraint-based timetable generator using **OR-Tools CP-SAT**.

## Usage

```bash
pip install ortools
python cse_final_scheduler.py
```

## Structure

```
├── cse_final_scheduler.py   # Scheduler
├── config/config.json       # Configuration
├── output/                  # Generated timetables
└── tools/                   # Utilities
```

## Configuration (`config/config.json`)

| Key | Description |
|-----|-------------|
| `courses` | L (lectures), T (tutorials), P (practical hours, must be even) |
| `teachers` | ID, name, min/max workload, course preferences |
| `classes` | Year, semester, student strength |
| `rooms` | Theory rooms + labs with capacities |
| `schedule` | Days and hours |
| `fixed_rooms` | Assign specific rooms to classes |

## Constraints

**Hard:**
- LTP hours per course
- Teacher workload limits (min/max)
- No overlaps (teacher/room/class)
- Practicals as 2-hour blocks (P=2 → one block)
- Max one practical per course per day
- Room capacity ≥ class strength
- Fixed theory room per class

**Optimization:**
1. Minimize peak slot load
2. Maximize teacher preferences

## Output

Generated in `output/`:
- `class_timetable.json/txt`
- `faculty_timetable.json/txt`  
- `solution.json`
