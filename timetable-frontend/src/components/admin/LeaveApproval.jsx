import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const LeaveApproval = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPendingLeaves();
      setLeaves(response.data.data);
    } catch (err) {
      setError('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!confirm('Are you sure you want to approve this leave request?')) {
      return;
    }

    try {
      setLoading(true);
      await adminAPI.approveLeave(id);
      await fetchLeaves();
      alert('Leave approved successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve leave');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Please enter the rejection reason:');
    if (!reason) {
      return;
    }

    try {
      setLoading(true);
      await adminAPI.rejectLeave(id, reason);
      await fetchLeaves();
      alert('Leave rejected successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject leave');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getLeaveTypeBadge = (type) => {
    const badges = {
      casual: 'bg-blue-100 text-blue-800',
      sick: 'bg-purple-100 text-purple-800',
      earned: 'bg-green-100 text-green-800',
      maternity: 'bg-pink-100 text-pink-800',
      paternity: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Leave Approval Management</h2>
          <button
            onClick={fetchLeaves}
            className="btn-secondary"
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Refresh'}
          </button>
        </div>

        <ErrorMessage message={error} onClose={() => setError('')} />

        {loading ? (
          <div className="py-8">
            <LoadingSpinner />
          </div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">No pending leave requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faculty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.map((leave) => {
                  const startDate = new Date(leave.startDate);
                  const endDate = new Date(leave.endDate);
                  const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

                  return (
                    <tr key={leave._id}>
                      <td className="table-cell">
                        <div>
                          <div className="font-medium">{leave.faculty?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{leave.faculty?.email}</div>
                        </div>
                      </td>
                      <td className="table-cell">{leave.faculty?.department || 'N/A'}</td>
                      <td className="table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs capitalize ${getLeaveTypeBadge(leave.leaveType)}`}>
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm">
                          <div>{startDate.toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">to</div>
                          <div>{endDate.toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="font-medium">{duration}</span> day{duration > 1 ? 's' : ''}
                      </td>
                      <td className="table-cell max-w-xs">
                        <div className="truncate" title={leave.reason}>
                          {leave.reason}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs capitalize ${getStatusBadge(leave.status)}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        {leave.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApprove(leave._id)}
                              className="text-green-600 hover:text-green-800 font-medium"
                              disabled={loading}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(leave._id)}
                              className="text-red-600 hover:text-red-800 font-medium"
                              disabled={loading}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {leave.status === 'approved' && (
                          <span className="text-green-600 text-sm">✓ Approved</span>
                        )}
                        {leave.status === 'rejected' && (
                          <div>
                            <span className="text-red-600 text-sm">✗ Rejected</span>
                            {leave.rejectionReason && (
                              <div className="text-xs text-gray-500 mt-1" title={leave.rejectionReason}>
                                {leave.rejectionReason.substring(0, 30)}...
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card bg-yellow-50 border border-yellow-200">
        <h3 className="font-semibold text-yellow-900 mb-2">Note</h3>
        <p className="text-sm text-yellow-800">
          When approving leave, consider checking if the faculty has classes scheduled during the leave period. 
          The system will track affected classes for rescheduling purposes.
        </p>
      </div>
    </div>
  );
};

export default LeaveApproval;