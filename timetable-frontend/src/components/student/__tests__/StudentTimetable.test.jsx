import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import StudentTimetable from '../StudentTimetable';
import { studentAPI, timetableAPI } from '../../../services/api';
import { vi } from 'vitest';

// Mock API
vi.mock('../../../services/api', () => ({
    studentAPI: {
        getFormattedTimetable: vi.fn(),
    },
    timetableAPI: {
        getActiveCalendar: vi.fn(),
    },
}));

// Mock LoadingSpinner
vi.mock('../../common/LoadingSpinner', () => ({
    default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

describe('StudentTimetable', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // --- SUCCESS CASES ---

    it('should render loading spinner initially', async () => {
        // Return a promise that never resolves immediately to check loading state
        timetableAPI.getActiveCalendar.mockImplementation(() => new Promise(() => { }));

        render(<StudentTimetable />);
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should render timetable and course details correctly', async () => {
        timetableAPI.getActiveCalendar.mockResolvedValue({
            data: { data: { _id: 'cal123' } }
        });
        studentAPI.getFormattedTimetable.mockResolvedValue({
            data: {
                data: {
                    timetable: {
                        Monday: [
                            {
                                slotNumber: 1,
                                course: { code: 'CS101', name: 'Intro to CS' },
                                faculty: { name: 'Dr. Smith' },
                                room: { number: '101' }
                            }
                        ],
                        Tuesday: [],
                        Wednesday: [],
                        Thursday: [],
                        Friday: [],
                        Saturday: []
                    }
                }
            }
        });

        render(<StudentTimetable />);

        await waitFor(() => expect(screen.getByText('Class Timetable')).toBeInTheDocument());
        expect(screen.getByText('CS101')).toBeInTheDocument();
        expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    });

    it('should filter by year', async () => {
        timetableAPI.getActiveCalendar.mockResolvedValue({
            data: { data: { _id: 'cal123' } }
        });
        studentAPI.getFormattedTimetable.mockResolvedValue({ data: { data: { timetable: {} } } });

        render(<StudentTimetable />);
        await waitFor(() => expect(studentAPI.getFormattedTimetable).toHaveBeenCalledWith(expect.objectContaining({ year: 1 })));

        const yearSelect = screen.getAllByRole('combobox')[0]; // First select is year
        fireEvent.change(yearSelect, { target: { value: '2' } });

        await waitFor(() => expect(studentAPI.getFormattedTimetable).toHaveBeenCalledWith(expect.objectContaining({ year: 2 })));
    });

    it('should filter by section', async () => {
        timetableAPI.getActiveCalendar.mockResolvedValue({
            data: { data: { _id: 'cal123' } }
        });
        studentAPI.getFormattedTimetable.mockResolvedValue({ data: { data: { timetable: {} } } });

        render(<StudentTimetable />);
        await waitFor(() => expect(studentAPI.getFormattedTimetable).toHaveBeenCalledWith(expect.objectContaining({ section: 'A' })));

        const sectionSelect = screen.getAllByRole('combobox')[1]; // Second select is section
        fireEvent.change(sectionSelect, { target: { value: 'B' } });

        await waitFor(() => expect(studentAPI.getFormattedTimetable).toHaveBeenCalledWith(expect.objectContaining({ section: 'B' })));
    });

    it('should handle empty slots in grid', async () => {
        timetableAPI.getActiveCalendar.mockResolvedValue({
            data: { data: { _id: 'cal123' } }
        });
        studentAPI.getFormattedTimetable.mockResolvedValue({
            data: {
                data: {
                    timetable: {
                        Monday: [], // No entries
                        Tuesday: [],
                        Wednesday: [],
                        Thursday: [],
                        Friday: [],
                        Saturday: []
                    }
                }
            }
        });

        render(<StudentTimetable />);

        await waitFor(() => expect(screen.getByText('Class Timetable')).toBeInTheDocument());
        // Check for dashboards/empty indicators (rendered as '-')
        const emptySlots = screen.getAllByText('-');
        expect(emptySlots.length).toBeGreaterThan(0);
    });

    // --- FAILURE CASES ---

    it('should handle calendar fetch error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        timetableAPI.getActiveCalendar.mockRejectedValue(new Error('Calendar API Error'));

        render(<StudentTimetable />);

        await waitFor(() => expect(screen.getByText('No timetable available')).toBeInTheDocument());
        consoleSpy.mockRestore();
    });

    it('should handle formatted timetable fetch error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        timetableAPI.getActiveCalendar.mockResolvedValue({
            data: { data: { _id: 'cal123' } }
        });
        studentAPI.getFormattedTimetable.mockRejectedValue(new Error('Timetable API Error'));

        render(<StudentTimetable />);

        await waitFor(() => expect(screen.getByText('No timetable available')).toBeInTheDocument());
        consoleSpy.mockRestore();
    });

    it('should render "No timetable available" if data is null', async () => {
        timetableAPI.getActiveCalendar.mockResolvedValue({
            data: { data: { _id: 'cal123' } }
        });
        // Returning null data effectively, or just empty response that doesn't set state
        // But our component sets data only on success. Ideally we simulate a case where it returns success: false or similar if handled,
        // but here the component catches error and sets loading false.
        // If state remains null, it shows the message.
        studentAPI.getFormattedTimetable.mockRejectedValue(new Error('Fail'));

        render(<StudentTimetable />);
        await waitFor(() => expect(screen.getByText('No timetable available')).toBeInTheDocument());
    });

    it('should handle missing calendar ID correctly', async () => {
        // If getActiveCalendar returns malformed data
        timetableAPI.getActiveCalendar.mockResolvedValue({ data: { data: {} } }); // No _id

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        render(<StudentTimetable />);

        // It will likely throw when accessing _id or fail next call?
        // Actually accessing undefined._id would throw in the component if not careful, 
        // but here existing code: `const academicCalendarId = calRes.data.data._id;` might return undefined
        // then formattedTimetable called with undefined. check if it handles it.

        await waitFor(() => expect(studentAPI.getFormattedTimetable).toHaveBeenCalled());
        consoleSpy.mockRestore();
    });

});
