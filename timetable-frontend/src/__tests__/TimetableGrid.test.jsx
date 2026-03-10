import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import TimetableGrid from '../components/admin/TimetableGrid';

expect.extend(matchers);

describe('TimetableGrid', () => {
    const mockTimetable = {
        entries: [
            {
                day: 'Monday',
                slotNumber: 1,
                course: { courseCode: 'CS101', courseName: 'Computer Science 101' },
                faculty: { name: 'Dr. Smith' },
                room: { roomNumber: '101' },
                year: 1,
                section: 'A'
            }
        ]
    };

    afterEach(() => {
        cleanup();
    });

    it('renders "No timetable data to display" when timetable is null', () => {
        render(<TimetableGrid timetable={null} />);
        expect(screen.getByText(/No timetable data to display/i)).toBeDefined();
    });

    it('renders the grid with entries', () => {
        render(<TimetableGrid timetable={mockTimetable} />);

        expect(screen.getByText('Monday')).toBeDefined();
        expect(screen.getByText('CS101')).toBeDefined();
        expect(screen.getByText('Dr. Smith')).toBeDefined();
        expect(screen.getByText('101')).toBeDefined();
        expect(screen.getByText('Y1-A')).toBeDefined();
    });

    it('filters entries by year and section', () => {
        const multiYearTimetable = {
            entries: [
                { ...mockTimetable.entries[0], year: 1, section: 'A', course: { courseCode: 'Y1A' } },
                { ...mockTimetable.entries[0], year: 2, section: 'B', course: { courseCode: 'Y2B' } }
            ]
        };

        const { rerender } = render(<TimetableGrid timetable={multiYearTimetable} selectedYear="1" selectedSection="A" />);
        expect(screen.getByText('Y1A')).toBeDefined();
        expect(screen.queryByText('Y2B')).toBeNull();

        rerender(<TimetableGrid timetable={multiYearTimetable} selectedYear="2" selectedSection="B" />);
        expect(screen.getByText('Y2B')).toBeDefined();
        expect(screen.queryByText('Y1A')).toBeNull();
    });
});
