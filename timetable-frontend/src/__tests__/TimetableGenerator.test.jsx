import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import TimetableGenerator from '../components/admin/TimetableGenerator';
import { adminAPI, timetableAPI } from '../services/api';
import React from 'react';

expect.extend(matchers);

// Mock the API services
vi.mock('../services/api', () => ({
    adminAPI: {
        getAcademicCalendars: vi.fn(),
    },
    timetableAPI: {
        generateTimetable: vi.fn(),
        getConflicts: vi.fn(),
        getStatistics: vi.fn(),
    },
}));

// Mock child components
vi.mock('../components/admin/TimetableGrid', () => ({
    default: () => <div data-testid="timetable-grid">Timetable Grid</div>,
}));

describe('TimetableGenerator', () => {
    const mockCalendars = [
        { _id: 'cal1', academicYear: '2023-24', semester: 'Odd', isActive: true },
        { _id: 'cal2', academicYear: '2023-24', semester: 'Even', isActive: true },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        adminAPI.getAcademicCalendars.mockResolvedValue({ data: { data: mockCalendars } });
        vi.stubGlobal('alert', vi.fn());
    });

    afterEach(() => {
        cleanup();
    });

    it('renders correctly and fetches calendars', async () => {
        render(<TimetableGenerator />);

        // Use more specific selectors to avoid "multiple elements" errors
        expect(screen.getByRole('heading', { name: /Generate Timetable/i })).toBeInTheDocument();

        // Wait for specific mock data to appear in the select options
        const oddOption = await screen.findByRole('option', { name: /2023-24 - Odd/i });
        const evenOption = await screen.findByRole('option', { name: /2023-24 - Even/i });

        expect(oddOption).toBeInTheDocument();
        expect(evenOption).toBeInTheDocument();
    });

    it('shows error if generate is clicked without selecting a calendar', async () => {
        const user = userEvent.setup();
        render(<TimetableGenerator />);

        const generateBtn = screen.getByRole('button', { name: /^Generate Timetable$/i });
        await user.click(generateBtn);

        expect(await screen.findByText(/Please select an academic calendar/i)).toBeInTheDocument();
    });

    it('calls generateTimetable API on button click', async () => {
        const user = userEvent.setup();
        timetableAPI.generateTimetable.mockResolvedValue({
            data: {
                success: true,
                data: { _id: 't1', status: 'generated', entries: [{}] },
                generationTime: 1500,
            },
        });

        render(<TimetableGenerator />);

        // Wait for the options to load
        const select = await screen.findByRole('combobox');
        await screen.findByRole('option', { name: /2023-24 - Odd/i });

        await user.selectOptions(select, 'cal1');

        const generateBtn = screen.getByRole('button', { name: /^Generate Timetable$/i });
        await user.click(generateBtn);

        await waitFor(() => {
            expect(timetableAPI.generateTimetable).toHaveBeenCalledWith('cal1');
        });

        expect(screen.getByTestId('timetable-grid')).toBeInTheDocument();
    });
});
