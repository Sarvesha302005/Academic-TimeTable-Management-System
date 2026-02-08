import React, { useState, useEffect } from 'react';
import { adminAPI, timetableAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import TimetableGrid from './TimetableGrid';

const TimetableGenerator = () => {
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [timetable, setTimetable] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchCalendars();
  }, []);

  const fetchCalendars = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAcademicCalendars();
      setCalendars(res.data.data.filter(c => c.isActive));
    } catch {
      setError('Failed to fetch calendars');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedCalendar) {
      setError('Please select an academic calendar');
      return;
    }

    try {
      setGenerating(true);
      setError('');

      const res = await timetableAPI.generateTimetable(selectedCalendar);

      // ✅ timetable only
      setTimetable(res.data.data);

      // ✅ metadata
      setStats({
        generationTime: res.data.generationTime,
        constraintsSatisfied: res.data.data.metadata?.constraintsSatisfied,
        totalClasses: res.data.data.statistics?.totalClasses
      });

      alert('Timetable generated successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Timetable generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const viewConflicts = async () => {
    if (!selectedCalendar) {
      setError('Please select an academic calendar');
      return;
    }

    const res = await timetableAPI.getConflicts({ academicCalendarId: selectedCalendar });
    const conflicts = res.data.data;

    if (conflicts.length === 0) {
      alert('No conflicts found ✓');
    } else {
      console.log(conflicts);
      alert(`Found ${conflicts.length} conflicts`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Generate Timetable</h2>
        <ErrorMessage message={error} onClose={() => setError('')} />

        <label className="label">Academic Calendar</label>
        <select
          className="input-field"
          value={selectedCalendar}
          onChange={e => setSelectedCalendar(e.target.value)}
        >
          <option value="">-- Select Calendar --</option>
          {calendars.map(cal => (
            <option key={cal._id} value={cal._id}>
              {cal.academicYear} - {cal.semester}
            </option>
          ))}
        </select>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleGenerate}
            className="btn-primary"
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate Timetable'}
          </button>

          <button
            onClick={viewConflicts}
            className="bg-purple-500 text-white px-4 py-2 rounded"
          >
            Check Conflicts
          </button>
        </div>

        {stats && (
          <div className="mt-6 bg-green-50 p-4 rounded border">
            <p><b>Status:</b> {timetable.status}</p>
            <p><b>Generation Time:</b> {stats.generationTime} ms</p>
            <p><b>Constraints Satisfied:</b> {stats.constraintsSatisfied ? 'Yes' : 'No'}</p>
            <p><b>Total Classes:</b> {stats.totalClasses ?? 'N/A'}</p>
          </div>
        )}

        {timetable?.entries?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-4">Generated Timetable</h3>
            <TimetableGrid timetable={timetable} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableGenerator;
