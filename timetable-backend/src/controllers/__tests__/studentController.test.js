const studentController = require('../studentController');
const timetableService = require('../../services/timetableService');
const httpMocks = require('node-mocks-http');

// Mock service
jest.mock('../../services/timetableService');

describe('Student Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        next = jest.fn();
        jest.clearAllMocks();
    });

    // --- SUCCESS CASES ---

    describe('getFormattedTimetable', () => {
        it('should return formatted timetable successfully', async () => {
            req.query = { academicCalendarId: 'cal123', year: '1', section: 'A' };

            const mockTimetable = {
                status: 'generated',
                academicCalendar: 'cal123',
                entries: [
                    { day: 'Monday', slotNumber: 1, course: { courseName: 'Math' } },
                    { day: 'Tuesday', slotNumber: 2, course: { courseName: 'Physics' } }
                ],
                statistics: {}
            };
            timetableService.getTimetableByYearSection.mockResolvedValue(mockTimetable);

            await studentController.getFormattedTimetable(req, res, next);

            expect(res.statusCode).toBe(200);
            expect(res._getJSONData().success).toBe(true);
            expect(res._getJSONData().data.timetable.Monday).toBeDefined();
        });

        it('should handle timetable locked status', async () => {
            req.query = { academicCalendarId: 'cal123', year: '1', section: 'A' };
            timetableService.getTimetableByYearSection.mockResolvedValue({ status: 'locked', entries: [] });

            await studentController.getFormattedTimetable(req, res, next);
            expect(res.statusCode).toBe(200);
        });

        it('should sort slots correctly', async () => {
            req.query = { academicCalendarId: 'cal123', year: '1', section: 'A' };
            const mockTimetable = {
                status: 'generated',
                entries: [
                    { day: 'Monday', slotNumber: 2 },
                    { day: 'Monday', slotNumber: 1 }
                ]
            };
            timetableService.getTimetableByYearSection.mockResolvedValue(mockTimetable);

            await studentController.getFormattedTimetable(req, res, next);

            const mondaySlots = res._getJSONData().data.timetable.Monday;
            expect(mondaySlots[0].slotNumber).toBe(1);
            expect(mondaySlots[1].slotNumber).toBe(2);
        });
    });

    describe('viewTimetable', () => {
        it('should return raw timetable data', async () => {
            req.query = { academicCalendarId: 'cal123', year: '1', section: 'A' };
            const mockTimetable = { status: 'locked', id: 'tt123' };
            timetableService.getTimetableByYearSection.mockResolvedValue(mockTimetable);

            await studentController.viewTimetable(req, res, next);
            expect(res.statusCode).toBe(200);
            expect(res._getJSONData().data.id).toBe('tt123');
        });

        it('should handle empty slots gracefully', async () => {
            req.query = { academicCalendarId: 'cal123', year: '1', section: 'A' };
            const mockTimetable = {
                status: 'generated',
                entries: [
                    { day: 'Monday', slotNumber: 1, course: null } // No course
                ]
            };
            timetableService.getTimetableByYearSection.mockResolvedValue(mockTimetable);

            await studentController.getFormattedTimetable(req, res, next);
            const mondaySlots = res._getJSONData().data.timetable.Monday;
            expect(mondaySlots[0].course.name).toBe('?');
        });
    });


    // --- FAILURE CASES ---

    describe('getFormattedTimetable (failure)', () => {
        it('should fail if missing query params', async () => {
            req.query = { year: '1' };

            await studentController.getFormattedTimetable(req, res, next);

            expect(res.statusCode).toBe(400);
        });

        it('should return 404 if timetable not found', async () => {
            req.query = { academicCalendarId: 'cal123', year: '1', section: 'A' };
            timetableService.getTimetableByYearSection.mockResolvedValue(null);

            await studentController.getFormattedTimetable(req, res, next);

            expect(res.statusCode).toBe(404);
        });

        it('should return 404 if timetable status is not generated/locked', async () => {
            req.query = { academicCalendarId: 'cal123', year: '1', section: 'A' };
            timetableService.getTimetableByYearSection.mockResolvedValue({ status: 'draft' });

            await studentController.getFormattedTimetable(req, res, next);
            expect(res.statusCode).toBe(404);
        });

        it('should handle service errors', async () => {
            req.query = { academicCalendarId: 'cal123', year: '1', section: 'A' };
            timetableService.getTimetableByYearSection.mockRejectedValue(new Error('DB Error'));

            await studentController.getFormattedTimetable(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('viewTimetable (failure)', () => {
        it('should return 404 if timetable not locked', async () => {
            req.query = { academicCalendarId: 'cal123', year: '1', section: 'A' };
            timetableService.getTimetableByYearSection.mockResolvedValue({ status: 'generated' }); // View only sees locked

            await studentController.viewTimetable(req, res, next);
            expect(res.statusCode).toBe(404);
        });
    });
});
