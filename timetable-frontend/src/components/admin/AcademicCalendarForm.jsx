import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const AcademicCalendarForm = () => {
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    academicYear: '',
    semester: 'Odd-Semester',
    startDate: '',
    endDate: '',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    isActive: true,
  });

  useEffect(() => {
    fetchCalendars();
  }, []);

  const fetchCalendars = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAcademicCalendars();
      setCalendars(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch calendars');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await adminAPI.createAcademicCalendar(formData);
      await fetchCalendars();
      setFormData({
        academicYear: '',
        semester: 'Odd-Semester',
        startDate: '',
        endDate: '',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        isActive: true,
      });
      alert('Academic calendar created successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this calendar?')) return;
    try {
      setLoading(true);
      await adminAPI.deleteAcademicCalendar(id);
      await fetchCalendars();
      alert('Academic calendar deleted successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Create Academic Calendar</h2>
        <ErrorMessage message={error} onClose={() => setError('')} />

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Academic Year</label>
              <input
                type="text"
                placeholder="2024-2025"
                className="input-field"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Semester</label>
              <select
                className="input-field"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              >
                <option value="Odd-Semester">Odd-Semester</option>
                <option value="Even-Semester">Even-Semester</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input-field"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input-field"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Working Days</label>
            <div className="flex flex-wrap gap-2">
              {days.map(day => (
                <label key={day} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.workingDays.includes(day)}
                    onChange={() => handleDayToggle(day)}
                    className="rounded"
                  />
                  <span className="text-sm">{day}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : 'Create Calendar'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Existing Calendars</h2>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Semester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calendars.map((calendar) => (
                  <tr key={calendar._id}>
                    <td className="table-cell">{calendar.academicYear}</td>
                    <td className="table-cell">{calendar.semester}</td>
                    <td className="table-cell">{new Date(calendar.startDate).toLocaleDateString()}</td>
                    <td className="table-cell">{new Date(calendar.endDate).toLocaleDateString()}</td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleDelete(calendar._id)}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicCalendarForm;