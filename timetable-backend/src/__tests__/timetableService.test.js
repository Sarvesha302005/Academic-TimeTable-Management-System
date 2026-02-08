const timetableService = require('../services/timetableService');
const Timetable = require('../models/Timetable');
const AcademicCalendar = require('../models/AcademicCalendar');
const Course = require('../models/Course');
const Faculty = require('../models/Faculty');
const Room = require('../models/Room');
const TimeSlot = require('../models/TimeSlot');
const FacultyPreference = require('../models/FacultyPreference');
const WorkloadRule = require('../models/WorkloadRule');

jest.mock('../models/Timetable');
jest.mock('../models/AcademicCalendar');
jest.mock('../models/Course');
jest.mock('../models/Faculty');
jest.mock('../models/Room');
jest.mock('../models/TimeSlot');
jest.mock('../models/FacultyPreference');
jest.mock('../models/WorkloadRule');

describe('TimetableService', () => {
    describe('calculateStatistics', () => {
        it('should calculate statistics correctly', () => {
            const mockEntries = [
                { faculty: 'f1', room: 'r1' },
                { faculty: 'f1', room: 'r2' },
                { faculty: 'f2', room: 'r1' }
            ];
            const mockData = {
                timeSlots: [1, 2],
                workingDays: ['Mon', 'Tue']
            };

            const stats = timetableService.calculateStatistics(mockEntries, mockData);

            expect(stats.totalClasses).toBe(3);
            expect(stats.facultyDistribution).toEqual({ f1: 2, f2: 1 });
            expect(stats.roomDistribution).toEqual({ r1: 2, r2: 1 });
        });
    });

    describe('prepareSchedulingData', () => {
        it('should throw error if academic calendar not found', async () => {
            AcademicCalendar.findById.mockResolvedValue(null);

            await expect(timetableService.prepareSchedulingData('someId'))
                .rejects.toThrow('Academic calendar not found');
        });

        it('should prepare data correctly when all models return valid data', async () => {
            AcademicCalendar.findById.mockResolvedValue({
                _id: 'calId',
                workingDays: ['Mon']
            });
            Course.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue([
                        { _id: 'course1', courseCode: 'CS101', sections: ['A'], lectureHours: 3 }
                    ])
                })
            });
            Faculty.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: 'f1', name: 'Fac1' }]) });
            Room.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ roomNumber: '101', roomType: 'theory' }]) });
            TimeSlot.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue([{ startTime: '09:00' }])
                })
            });
            FacultyPreference.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue([])
                })
            });
            WorkloadRule.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ minHoursPerWeek: 10, maxHoursPerWeek: 20 }) });

            const data = await timetableService.prepareSchedulingData('calId');

            expect(data.courses).toBeDefined();
            expect(data.courses['CS101-A']).toBeDefined();
            expect(data.teachers.length).toBe(1);
            expect(data.rooms.theory).toContain('101');
        });
    });
});
