import json
import os
import tempfile

from workload_analyzer import analyze_workload


def test_analyze_workload_creates_reports(tmp_path):
    # Prepare a fake faculty timetable with two faculty members
    faculty_data = {
        "Dr. Alice": [
            {"day": "Mon", "slot": 1},
            {"day": "Tue", "slot": 2},
        ],
        "Dr. Bob": [
            {"day": "Mon", "slot": 1},
            {"day": "Tue", "slot": 2},
            {"day": "Wed", "slot": 3},
            {"day": "Thu", "slot": 4},
        ],
    }

    # Write the faculty timetable to a temp file
    faculty_file = tmp_path / "faculty_timetable.json"
    with open(faculty_file, "w") as f:
        json.dump(faculty_data, f)

    # Run analysis
    output_dir = tmp_path / "out"
    os.makedirs(output_dir, exist_ok=True)

    analyze_workload(str(faculty_file), str(output_dir))

    # Verify JSON and TXT reports were created
    json_path = os.path.join(str(output_dir), "workload_report.json")
    txt_path = os.path.join(str(output_dir), "workload_report.txt")

    assert os.path.exists(json_path), "JSON report was not created"
    assert os.path.exists(txt_path), "TXT report was not created"

    # Load and check some sensible contents
    with open(json_path, "r") as f:
        report = json.load(f)

    assert "faculty_metrics" in report
    assert "global_metrics" in report
    assert "Dr. Alice" in report["faculty_metrics"]
    assert report["faculty_metrics"]["Dr. Alice"]["total_hours"] == 2
    assert report["faculty_metrics"]["Dr. Bob"]["total_hours"] == 4
