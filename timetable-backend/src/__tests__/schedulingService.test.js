const schedulingService = require('../services/schedulingService');
const { spawn } = require('child_process');
const EventEmitter = require('events');

jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

describe('SchedulingService', () => {
    describe('validateConstraints', () => {
        it('should return isValid: true for valid data', () => {
            const validData = {
                courses: { 'CSE101': {} },
                teachers: [{ id: '1', prefs: {} }],
                rooms: { theory: ['101'], lab: [] },
                timeSlots: [{ slotNumber: 1 }],
                workingDays: ['Mon'],
                room_capacities: { '101': 30 }
            };

            const result = schedulingService.validateConstraints(validData);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should return errors for missing data', () => {
            const invalidData = {
                courses: {},
                teachers: [],
                rooms: { theory: [], lab: [] },
                timeSlots: [],
                workingDays: []
            };

            const result = schedulingService.validateConstraints(invalidData);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('No courses found');
            expect(result.errors).toContain('No faculty found');
            expect(result.errors).toContain('No rooms found');
        });
    });

    describe('generateTimetable', () => {
        let mockProcess;

        beforeEach(() => {
            mockProcess = new EventEmitter();
            mockProcess.stdin = {
                write: jest.fn(),
                end: jest.fn()
            };
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();

            spawn.mockReturnValue(mockProcess);
        });

        it('should resolve with parsed result on success', async () => {
            const mockResult = { status: 'success', solution: {} };

            const promise = schedulingService.generateTimetable({ dummy: 'data' });

            // Simulate Python output
            mockProcess.stdout.emit('data', Buffer.from(JSON.stringify(mockResult)));
            mockProcess.emit('close', 0);

            const result = await promise;
            expect(result).toEqual(mockResult);
            expect(mockProcess.stdin.write).toHaveBeenCalled();
        });

        it('should reject if Python process exits with non-zero code', async () => {
            const promise = schedulingService.generateTimetable({ dummy: 'data' });

            mockProcess.stderr.emit('data', Buffer.from('Some error'));
            mockProcess.emit('close', 1);

            await expect(promise).rejects.toThrow('Scheduling failed: Some error');
        });

        it('should reject if Python output is invalid JSON', async () => {
            const promise = schedulingService.generateTimetable({ dummy: 'data' });

            mockProcess.stdout.emit('data', Buffer.from('invalid json'));
            mockProcess.emit('close', 0);

            await expect(promise).rejects.toThrow('Failed to parse scheduler output');
        });
    });
});
