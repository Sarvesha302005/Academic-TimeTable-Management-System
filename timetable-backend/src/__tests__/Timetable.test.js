const Timetable = require('../models/Timetable');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany();
    }
});

describe('Timetable Model', () => {
    const mockAcademicCalendarId = new mongoose.Types.ObjectId();
    const mockTimeSlotId = new mongoose.Types.ObjectId();
    const mockCourseId = new mongoose.Types.ObjectId();
    const mockFacultyId = new mongoose.Types.ObjectId();
    const mockRoomId = new mongoose.Types.ObjectId();

    const validTimetableEntry = {
        day: 'Monday',
        slot: mockTimeSlotId,
        slotNumber: 1,
        course: mockCourseId,
        faculty: mockFacultyId,
        room: mockRoomId,
        year: 1,
        section: 'A'
    };

    it('should create a valid timetable', async () => {
        const timetableData = {
            academicCalendar: mockAcademicCalendarId,
            status: 'draft',
            entries: [validTimetableEntry]
        };

        const timetable = new Timetable(timetableData);
        const savedTimetable = await timetable.save();

        expect(savedTimetable._id).toBeDefined();
        expect(savedTimetable.academicCalendar.toString()).toBe(mockAcademicCalendarId.toString());
        expect(savedTimetable.entries.length).toBe(1);
        expect(savedTimetable.status).toBe('draft');
    });

    it('should fail if academicCalendar is missing', async () => {
        const timetableData = {
            status: 'draft',
            entries: [validTimetableEntry]
        };

        const timetable = new Timetable(timetableData);
        let err;
        try {
            await timetable.save();
        } catch (error) {
            err = error;
        }

        expect(err).toBeDefined();
        expect(err.errors.academicCalendar).toBeDefined();
    });

    it('should set default status to draft', async () => {
        const timetable = new Timetable({
            academicCalendar: mockAcademicCalendarId
        });
        const savedTimetable = await timetable.save();
        expect(savedTimetable.status).toBe('draft');
    });

    it('should fail if entry day is invalid', async () => {
        const timetableData = {
            academicCalendar: mockAcademicCalendarId,
            entries: [{
                ...validTimetableEntry,
                day: 'InvalidDay'
            }]
        };

        const timetable = new Timetable(timetableData);
        let err;
        try {
            await timetable.save();
        } catch (error) {
            err = error;
        }

        expect(err).toBeDefined();
        expect(err.errors['entries.0.day']).toBeDefined();
    });
});