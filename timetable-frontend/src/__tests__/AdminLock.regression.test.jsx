import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TimetableGenerator from '../components/admin/TimetableGenerator';
import { adminAPI, timetableAPI } from '../services/api';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../services/api', () => ({
  adminAPI: {
    getAcademicCalendars: vi.fn(),
    lockTimetable: vi.fn(),
    unlockTimetable: vi.fn()
  },
  timetableAPI: {
    generateTimetable: vi.fn(),
    getConflicts: vi.fn()
  }
}));

describe('AdminLock Regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generates timetable and checks conflicts via API', async () => {
    adminAPI.getAcademicCalendars.mockResolvedValue({ data: { data: [{ _id: 'cal1', isActive: true, academicYear: '2026', semester: '1' }] } });
    timetableAPI.generateTimetable.mockResolvedValue({ data: { data: { status: 'generated' }, generationTime: 123 }, });
    timetableAPI.getConflicts.mockResolvedValue({ data: { data: [] } });

    render(<TimetableGenerator />);

    // Wait for calendars to load and then select
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'cal1' } });

    const genButton = screen.getByRole('button', { name: /Generate Timetable/i });
    fireEvent.click(genButton);

    await waitFor(() => expect(timetableAPI.generateTimetable).toHaveBeenCalled());

    const conflictsButton = screen.getByRole('button', { name: /Check Conflicts/i });
    fireEvent.click(conflictsButton);

    await waitFor(() => expect(timetableAPI.getConflicts).toHaveBeenCalled());
  });
});
