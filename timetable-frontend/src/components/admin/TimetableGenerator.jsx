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
  const [pollingStatus, setPollingStatus] = useState('');

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
      setPollingStatus('Starting generation...');

      // 1. Start the job
      const res = await timetableAPI.generateTimetable(selectedCalendar);
      const jobId = res.data.jobId;

      if (!jobId) {
        throw new Error('Failed to start timetable generation block');
      }

      // 2. Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await timetableAPI.getGenerationStatus(jobId);
          const status = statusRes.data.status;

          if (status === 'running') {
            setPollingStatus('Optimizing Timetable... this may take up to 5 minutes.');
          } else if (status === 'finished') {
            clearInterval(pollInterval);
            setPollingStatus('Retrieving Timetable...');
            fetchResult(jobId);
          } else if (status === 'failed') {
            clearInterval(pollInterval);
            throw new Error(statusRes.data.error || 'Timetable generation failed');
          }
        } catch (err) {
          // If the server is restarting or Render's load balancer drops the connection (502/Network Error/CORS),
          // DO NOT clear the interval. Just log it and wait for the backend to wake back up.
          if (err.message === 'Network Error' || err.response?.status === 502 || err.response?.status === 503) {
            console.warn('Backend temporarily unreachable (502/Network Error). Retrying on next poll...');
            setPollingStatus('Backend restarting or busy... waiting for response.');
            return; // Skip this tick, try again in 3 seconds
          }

          // But if it's a legitimate 400 error (e.g. jobId not found), then stop polling.
          if (err.response?.status === 404) {
            clearInterval(pollInterval);
            setError('Job ID expired or not found.');
            setGenerating(false);
            setPollingStatus('');
            return;
          }

          clearInterval(pollInterval);
          setError(err.response?.data?.error || err.message || 'Error checking status');
          setGenerating(false);
          setPollingStatus('');
        }
      }, 3000); // Poll every 3 seconds

    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Timetable generation failed');
      setGenerating(false);
      setPollingStatus('');
    }
  };

  const fetchResult = async (jobId) => {
    try {
      const res = await timetableAPI.getGenerationResult(jobId);

      // ✅ timetable only
      setTimetable(res.data.data);

      // ✅ metadata
      setStats({
        generationTime: res.data.generationTime,
        constraintsSatisfied: res.data.data?.metadata?.constraintsSatisfied,
        totalClasses: res.data.statistics?.totalClasses
      });

      alert('Timetable generated successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch timetable result');
    } finally {
      setGenerating(false);
      setPollingStatus('');
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
            className="btn-primary flex items-center gap-2"
            disabled={generating}
          >
            {generating && <LoadingSpinner size="sm" />}
            {generating ? (pollingStatus || 'Generating...') : 'Generate Timetable'}
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
