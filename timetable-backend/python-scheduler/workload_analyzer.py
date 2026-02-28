import json
import os
import sys
import math

def analyze_workload(faculty_timetable_path, output_dir):
    """
    Analyzes the faculty workload from the generated timetable and produces a report.
    """

    if not os.path.exists(faculty_timetable_path):
        print(f"[ERROR] Faculty timetable not found: {faculty_timetable_path}", file=sys.stderr)
        return

    with open(faculty_timetable_path, 'r') as f:
        faculty_timetable = json.load(f)

    report_data = {
        "faculty_metrics": {},
        "global_metrics": {}
    }

    total_hours_list = []
    IDEAL_LOAD = 17

    # ----------------------------
    # 1. Per-faculty metrics
    # ----------------------------
    for faculty, sessions in faculty_timetable.items():

        # each entry = 1 hour
        total_hours = len(sessions)
        total_hours_list.append(total_hours)

        deviation = total_hours - IDEAL_LOAD

        if total_hours < 16:
            status = "Underloaded"
        elif 16 <= total_hours <= 18:
            status = "Balanced"
        else:
            status = "Overloaded"

        report_data["faculty_metrics"][faculty] = {
            "total_hours": total_hours,
            "deviation": deviation,
            "status": status
        }

    # ----------------------------
    # 2. Global metrics
    # ----------------------------
    if total_hours_list:
        n = len(total_hours_list)

        avg_load = sum(total_hours_list) / n
        min_load = min(total_hours_list)
        max_load = max(total_hours_list)

        # Variance
        variance = sum((x - avg_load) ** 2 for x in total_hours_list) / n

        # Fairness Score
        avg_abs_dev = sum(abs(x - avg_load) for x in total_hours_list) / n
        fairness_score = max(
            0,
            min(100, 100 * (1 - (avg_abs_dev / (avg_load if avg_load > 0 else 1))))
        )

        report_data["global_metrics"] = {
            "average_load": round(avg_load, 1),
            "min_load": min_load,
            "max_load": max_load,
            "variance": round(variance, 2),
            "fairness_score_pct": round(fairness_score, 1)
        }

    # ----------------------------
    # 3. Save JSON report
    # ----------------------------
    json_path = os.path.join(output_dir, "workload_report.json")
    with open(json_path, 'w') as f:
        json.dump(report_data, f, indent=2)

    # ----------------------------
    # 4. Save TXT report
    # ----------------------------
    txt_path = os.path.join(output_dir, "workload_report.txt")
    with open(txt_path, 'w') as f:
        f.write("Faculty Workload Report\n")
        f.write("=" * 30 + "\n")

        for faculty in sorted(report_data["faculty_metrics"].keys()):
            m = report_data["faculty_metrics"][faculty]
            f.write(f"{faculty:20} — {m['total_hours']:2} hrs — {m['status']}\n")

        f.write("\n" + "=" * 30 + "\n")
        g = report_data["global_metrics"]
        f.write(f"Average Load:    {g['average_load']}\n")
        f.write(f"Min / Max Load:  {g['min_load']} / {g['max_load']}\n")
        f.write(f"Variance:        {g['variance']}\n")
        f.write(f"Fairness Score:  {g['fairness_score_pct']}%\n")

    # IMPORTANT: logs go to stderr (NOT stdout)
    print(f"[OK] Workload analysis complete.", file=sys.stderr)
    print(f"     JSON: {json_path}", file=sys.stderr)
    print(f"     TXT:  {txt_path}", file=sys.stderr)


# Only runs when executed directly (NOT when imported by scheduler)
if __name__ == "__main__":
    script_dir = os.path.dirname(__file__)
    timetable_path = os.path.join(script_dir, "output", "faculty_timetable.json")
    output_dir = os.path.join(script_dir, "output")
    analyze_workload(timetable_path, output_dir)