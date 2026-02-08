import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import TimetableView from '../components/admin/TimetableView';
import { adminAPI, timetableAPI } from '../services/api';
import React from 'react';

expect.extend(matchers);

// Mock the API services
vi.mock('../services/api', () => ({
    adminAPI: {
        getAcademicCalendars: vi.fn(),
        lockTimetable: vi.fn(),
        unlockTimetable: vi.fn(),
    },
    timetableAPI: {
        getTimetable: vi.fn(),
    },
}));

// Mock child components
vi.mock('../components/admin/TimetableGrid', () => ({
    default: () => <div data-testid="timetable-grid">Timetable Grid</div>,
}));

describe('TimetableView', () => {
    const mockCalendars = [
        { _id: '1', academicYear: '2023-24', semester: 'Odd', isActive: true },
    ];

    const mockTimetable = {
        _id: 't1',
        status: 'generated',
        entries: [
            { year: 1, section: 'A' },
            { year: 2, section: 'B' },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        adminAPI.getAcademicCalendars.mockResolvedValue({ data: { data: mockCalendars } });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders and fetches calendars initially', async () => {
        render(<TimetableView />);

        expect(screen.getByText('View Timetable')).toBeDefined();
        await screen.findByRole('option', { name: /2023-24 - Odd/ });
    });

    it('fetches timetable when calendar is selected', async () => {
        const user = userEvent.setup();
        timetableAPI.getTimetable.mockResolvedValue({ data: { data: mockTimetable } });

        render(<TimetableView />);

        const select = await screen.findByRole('combobox');
        await user.selectOptions(select, '1');

        await waitFor(() => {
            expect(timetableAPI.getTimetable).toHaveBeenCalledWith({ academicCalendarId: '1' });
        });

        expect(screen.getByTestId('timetable-grid')).toBeDefined();
        expect(screen.getByText('Status: Generated')).toBeDefined();
        expect(screen.getByText('Lock Timetable')).toBeDefined();
    });

    it('handles locking the timetable', async () => {
        const user = userEvent.setup();
        timetableAPI.getTimetable.mockResolvedValue({ data: { data: mockTimetable } });
        adminAPI.lockTimetable.mockResolvedValue({ data: { success: true } });
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.spyOn(window, 'alert').mockImplementation(() => { });

        render(<TimetableView />);

        const select = await screen.findByRole('combobox');
        await user.selectOptions(select, '1');

        const lockBtn = await screen.findByText('Lock Timetable');
        await user.click(lockBtn);

        expect(window.confirm).toHaveBeenCalled();
        expect(adminAPI.lockTimetable).toHaveBeenCalledWith({ academicCalendarId: '1' });
    });
});
