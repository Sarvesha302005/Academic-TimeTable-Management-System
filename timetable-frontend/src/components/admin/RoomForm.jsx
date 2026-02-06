import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const RoomForm = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    roomNumber: '',
    roomType: 'classroom',
    capacity: 60,
    building: '',
    floor: 1,
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getRooms();
      setRooms(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await adminAPI.createRoom(formData);
      await fetchRooms();
      setFormData({
        roomNumber: '',
        roomType: 'classroom',
        capacity: 60,
        building: '',
        floor: 1,
      });
      alert('Room created successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    
    try {
      setLoading(true);
      await adminAPI.deleteRoom(id);
      await fetchRooms();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Create Room</h2>
        <ErrorMessage message={error} onClose={() => setError('')} />
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Room Number</label>
              <input
                type="text"
                placeholder="CS-101"
                className="input-field"
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label className="label">Room Type</label>
              <select
                className="input-field"
                value={formData.roomType}
                onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
              >
                <option value="classroom">Classroom</option>
                <option value="lab">Lab</option>
                <option value="seminar_hall">Seminar Hall</option>
                <option value="auditorium">Auditorium</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Capacity</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                required
              />
            </div>
            
            <div>
              <label className="label">Building</label>
              <input
                type="text"
                placeholder="Main Block"
                className="input-field"
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Floor</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : 'Create Room'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Existing Rooms</h2>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Building</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Floor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rooms.map((room) => (
                  <tr key={room._id}>
                    <td className="table-cell font-medium">{room.roomNumber}</td>
                    <td className="table-cell capitalize">{room.roomType.replace('_', ' ')}</td>
                    <td className="table-cell">{room.capacity}</td>
                    <td className="table-cell">{room.building || 'N/A'}</td>
                    <td className="table-cell">{room.floor || 'N/A'}</td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleDelete(room._id)}
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

export default RoomForm;