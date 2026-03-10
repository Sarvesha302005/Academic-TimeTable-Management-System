import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const WorkloadRuleForm = () => {
  const [calendars, setCalendars] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    academicCalendar: '',
    maxHoursPerWeek: 20,
    maxHoursPerDay: 6,
    maxConsecutiveHours: 3,
    minBreakBetweenClasses: 0,
    maxCoursesPerFaculty: 5,
    allowBackToBackLectures: true,
  });

  useEffect(() => {
    fetchCalendars();
    fetchRules();
  }, []);

  const fetchCalendars = async () => {
    try {
      const response = await adminAPI.getAcademicCalendars();
      setCalendars(response.data.data.filter(c => c.isActive));
    } catch (err) {
      setError('Failed to fetch calendars');
    }
  };

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getWorkloadRules();
      setRules(response.data.data);
    } catch (err) {
      setError('Failed to fetch workload rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await adminAPI.createWorkloadRule(formData);
      await fetchRules();
      setFormData({
        academicCalendar: '',
        maxHoursPerWeek: 20,
        maxHoursPerDay: 6,
        maxConsecutiveHours: 3,
        minBreakBetweenClasses: 0,
        maxCoursesPerFaculty: 5,
        allowBackToBackLectures: true,
      });
      alert('Workload rule created successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create workload rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Create Workload Rule</h2>
        <ErrorMessage message={error} onClose={() => setError('')} />
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="label">Academic Calendar</label>
            <select
              className="input-field"
              value={formData.academicCalendar}
              onChange={(e) => setFormData({ ...formData, academicCalendar: e.target.value })}
              required
            >
              <option value="">Select Academic Calendar</option>
              {calendars.map(cal => (
                <option key={cal._id} value={cal._id}>
                  {cal.academicYear} - {cal.semester}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Max Hours Per Week</label>
              <input
                type="number"
                min="1"
                max="40"
                className="input-field"
                value={formData.maxHoursPerWeek}
                onChange={(e) => setFormData({ ...formData, maxHoursPerWeek: parseInt(e.target.value) })}
                required
              />
            </div>
            
            <div>
              <label className="label">Max Hours Per Day</label>
              <input
                type="number"
                min="1"
                max="12"
                className="input-field"
                value={formData.maxHoursPerDay}
                onChange={(e) => setFormData({ ...formData, maxHoursPerDay: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Max Consecutive Hours</label>
              <input
                type="number"
                min="1"
                max="6"
                className="input-field"
                value={formData.maxConsecutiveHours}
                onChange={(e) => setFormData({ ...formData, maxConsecutiveHours: parseInt(e.target.value) })}
                required
              />
            </div>
            
            <div>
              <label className="label">Min Break Between Classes (hours)</label>
              <input
                type="number"
                min="0"
                max="2"
                className="input-field"
                value={formData.minBreakBetweenClasses}
                onChange={(e) => setFormData({ ...formData, minBreakBetweenClasses: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Max Courses Per Faculty</label>
              <input
                type="number"
                min="1"
                max="10"
                className="input-field"
                value={formData.maxCoursesPerFaculty}
                onChange={(e) => setFormData({ ...formData, maxCoursesPerFaculty: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowBackToBackLectures}
                  onChange={(e) => setFormData({ ...formData, allowBackToBackLectures: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Allow Back-to-Back Lectures</span>
              </label>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : 'Create Workload Rule'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Existing Workload Rules</h2>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calendar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max/Week</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max/Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Consecutive</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rules.map((rule) => (
                  <tr key={rule._id}>
                    <td className="table-cell">
                      {rule.academicCalendar?.academicYear} - {rule.academicCalendar?.semester}
                    </td>
                    <td className="table-cell">{rule.maxHoursPerWeek}</td>
                    <td className="table-cell">{rule.maxHoursPerDay}</td>
                    <td className="table-cell">{rule.maxConsecutiveHours}</td>
                    <td className="table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs ${rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
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

export default WorkloadRuleForm;