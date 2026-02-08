import React, { useState, useEffect } from 'react';
import { facultyAPI, timetableAPI } from '../../services/api';

/* =========================
   COURSE PREFERENCE FORM
========================= */

export const PreferenceForm = () => {
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    facultyAPI.getAvailableCourses()
      .then(res => setCourses(res.data.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load courses'));
  }, []);

  // Load saved preferences for the active academic calendar and preselect them
  useEffect(() => {
    async function loadPreferences() {
      try {
        const calRes = await timetableAPI.getActiveCalendar();
        const res = await facultyAPI.getPreferences({ academicCalendarId: calRes.data.data._id });
        const pref = res.data.data && res.data.data[0];
        if (pref && pref.preferences) {
          setSelected(pref.preferences.map(p => p.course._id));
          if (pref.isSubmitted) {
            setSubmitted(true);
          }
        }
      } catch (err) {
        // silently ignore - courses may not be available yet
      }
    }
    loadPreferences();
  }, []);

  const toggleCourse = (courseId) => {
    setSelected(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const validateYearRules = () => {
    const yearCount = { 1: 0, 2: 0, 3: 0, 4: 0 };
    selected.forEach(id => {
      const c = courses.find(x => x._id === id);
      if (c) yearCount[c.year] = (yearCount[c.year] || 0) + 1;
    });

    if (selected.length < 5) return 'Please select at least 5 courses';
    if (selected.length > 6) return 'You can select at most 6 courses';

    if (yearCount[1] > 1) return 'At most 1 course allowed for 1st year';
    if (yearCount[2] > 2) return 'At most 2 courses allowed for 2nd year';
    if (yearCount[3] > 2) return 'At most 2 courses allowed for 3rd year';
    if (yearCount[4] > 1) return 'At most 1 course allowed for 4th year';

    if ((yearCount[1] + yearCount[4]) !== 1) return 'Select exactly one course from either 1st or 4th year';

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selected.length) {
      setError('Please select at least one course');
      return;
    }

    const yearError = validateYearRules();
    if (yearError) {
      setError(yearError);
      return;
    }

    try {
      setLoading(true);
      const calRes = await timetableAPI.getActiveCalendar();
      await facultyAPI.submitPreferences({
        academicCalendarId: calRes.data.data._id,
        preferences: selected   // 👈 ONLY course IDs (correct)
      });
      setSubmitted(true);
      setSelected([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4">Course Preferences</h2>
      <p className="text-sm text-gray-600 mb-3">Select 5–6 courses. Max 2 from Year 2, max 2 from Year 3, and exactly one course from either Year 1 or Year 4 (max 1).</p>

      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      {submitted ? (
        <div className="p-4 bg-green-50 rounded text-center text-green-700 italic border border-green-200">
          You have successfully submitted your course preferences for this semester.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {courses.map(c => (
            <label key={c._id} className="block mb-2">
              <input
                type="checkbox"
                checked={selected.includes(c._id)}
                onChange={() => toggleCourse(c._id)}
              />
              <span className="ml-2">
                {c.courseCode} – {c.courseName} (Year {c.year})
              </span>
            </label>
          ))}
          <button className="btn-primary mt-4" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      )}
    </div>
  );
};

/* =========================
   LEAVE APPLICATION FORM
========================= */

export const LeaveApplicationForm = () => {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    leaveType: 'casual',
    reason: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await facultyAPI.applyLeave(formData);
    alert('Leave applied successfully');
    setFormData({ startDate: '', endDate: '', leaveType: 'casual', reason: '' });
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4">Apply Leave</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="date"
          className="input-field"
          value={formData.startDate}
          onChange={e => setFormData({ ...formData, startDate: e.target.value })}
          required
        />
        <input
          type="date"
          className="input-field"
          value={formData.endDate}
          onChange={e => setFormData({ ...formData, endDate: e.target.value })}
          required
        />
        <select
          className="input-field"
          value={formData.leaveType}
          onChange={e => setFormData({ ...formData, leaveType: e.target.value })}
        >
          <option value="casual">Casual</option>
          <option value="sick">Sick</option>
          <option value="earned">Earned</option>
        </select>
        <textarea
          className="input-field"
          placeholder="Reason"
          value={formData.reason}
          onChange={e => setFormData({ ...formData, reason: e.target.value })}
          required
        />
        <button className="btn-primary">Submit</button>
      </form>
    </div>
  );
};

/* =========================
   FACULTY TIMETABLE (REAL)
========================= */

export const FacultyTimetable = () => {
  const [timetable, setTimetable] = useState(null);
  const [faculty, setFaculty] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimetable();
  }, []);

  const loadTimetable = async () => {
    try {
      const calRes = await timetableAPI.getActiveCalendar();
      const res = await timetableAPI.getFacultyTimetable({
        academicCalendarId: calRes.data.data._id
      });

      setFaculty(res.data.data.faculty);
      setTimetable(res.data.data.timetable);
    } catch {
      setError('Timetable not generated yet');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="card">Loading timetable…</div>;
  if (error) return <div className="card">{error}</div>;

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const slots = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-2">My Timetable</h2>
      <p className="text-gray-600 mb-4">
        {faculty?.name} • {faculty?.department}
      </p>

      <div className="overflow-x-auto">
        <table className="border min-w-full">
          <thead>
            <tr>
              <th>Day / Slot</th>
              {slots.map(s => <th key={s}>S{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day}>
                <td className="font-medium">{day}</td>
                {slots.map(s => {
                  const entry = timetable && timetable[day]?.find(e => e.slotNumber === s);
                  return (
                    <td key={s} className="text-xs">
                      {entry ? (
                        <div className="p-1 bg-blue-50 rounded">
                          <div className="font-bold">{entry.course.code}</div>
                          <div>{entry.course.name}</div>
                          <div>{entry.room.number}</div>
                          <div>Y{entry.year}-{entry.section}</div>
                        </div>
                      ) : '–'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
