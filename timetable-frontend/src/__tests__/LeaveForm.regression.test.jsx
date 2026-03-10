import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeaveApplicationForm } from '../components/faculty';
import { facultyAPI } from '../services/api';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../services/api', () => ({
  facultyAPI: {
    applyLeave: vi.fn()
  }
}));

describe('LeaveForm Regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submits leave form and calls API', async () => {
    facultyAPI.applyLeave.mockResolvedValue({ data: { success: true } });
    const { container } = render(<LeaveApplicationForm />);

    // date inputs are rendered as input[type=date]
    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    fireEvent.change(dateInputs[0], { target: { value: '2026-03-15' } });
    fireEvent.change(dateInputs[1], { target: { value: '2026-03-16' } });

    // textarea for reason
    const reason = screen.getByRole('textbox');
    fireEvent.change(reason, { target: { value: 'Regression test' } });

    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() => expect(facultyAPI.applyLeave).toHaveBeenCalled());
  });
});
