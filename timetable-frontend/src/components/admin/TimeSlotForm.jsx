import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const TimeSlotForm = () => {
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    slotNumber: '',
    startTime: '',
    endTime: '',
    duration: 60,
    isBreak: false,
  });

  useEffect(() => {
    fetchTimeSlots();
  }, []);

  const fetchTimeSlots = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getTimeSlots();
      setTimeSlots(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch time slots');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await adminAPI.createTimeSlot(formData);
      await fetchTimeSlots();
      setFormData({
        slotNumber: '',
        startTime: '',
        endTime: '',
        duration: 60,
        isBreak: false,
      });
      alert('Time slot created successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create time slot');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this time slot?')) return;

    try {
      setLoading(true);
      await adminAPI.deleteTimeSlot(id);
      await fetchTimeSlots();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete time slot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Create Time Slot</h2>
        <ErrorMessage message={error} onClose={() => setError('')} />

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Slot Number</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={formData.slotNumber}
                onChange={(e) => setFormData({ ...formData, slotNumber: parseInt(e.target.value) })}
                required
              />
            </div>

            <div>
              <label className="label">Duration (minutes)</label>
              <input
                type="number"
                min="15"
                step="5"
                className="input-field"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Time</label>
              <input
                type="time"
                className="input-field"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">End Time</label>
              <input
                type="time"
                className="input-field"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isBreak}
                onChange={(e) => setFormData({ ...formData, isBreak: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">This is a break time</span>
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : 'Create Time Slot'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Existing Time Slots</h2>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slot #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeSlots.map((slot) => (
                  <tr key={slot._id}>
                    <td className="table-cell">{slot.slotNumber}</td>
                    <td className="table-cell">{slot.startTime}</td>
                    <td className="table-cell">{slot.endTime}</td>
                    <td className="table-cell">{slot.duration} min</td>
                    <td className="table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs ${slot.isBreak ? 'bg-yellow-100 text-yellow-800' : 'bg-primary-100 text-primary-800'}`}>
                        {slot.isBreak ? 'Break' : 'Class'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleDelete(slot._id)}
                        className="text-red-600 hover:text-red-800"
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

export default TimeSlotForm;