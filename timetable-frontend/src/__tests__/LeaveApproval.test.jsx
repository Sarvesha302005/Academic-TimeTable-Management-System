import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, test, expect } from 'vitest';
import LeaveApproval from '../components/admin/LeaveApproval';

// Mock the adminAPI module
vi.mock('../services/api', () => ({
  adminAPI: {
    getPendingLeaves: () => Promise.resolve({ data: { data: [] } }),
    approveLeave: () => Promise.resolve({ data: { success: true } }),
    rejectLeave: () => Promise.resolve({ data: { success: true } }),
  }
}));

describe('LeaveApproval component', () => {
  test('shows empty state when no leaves', async () => {
    render(<LeaveApproval />);
    await waitFor(() => expect(screen.getByText(/No pending leave requests/i)).toBeInTheDocument());
  });
});
