const request = require('supertest');
const express = require('express');
const timetableController = require('../controllers/timetableController');
const timetableService = require('../services/timetableService');
const Timetable = require('../models/Timetable');

const app = express();
app.use(express.json());

// Mock service and model
jest.mock('../services/timetableService');
jest.mock('../models/Timetable');

// Routes for testing
app.post('/api/timetable/generate', (req, res, next) => timetableController.generateTimetable(req, res, next));
app.get('/api/timetable', (req, res, next) => timetableController.getTimetable(req, res, next));

describe('TimetableController', () => {
    describe('POST /api/timetable/generate', () => {
        it('should return 400 if academicCalendarId is missing', async () => {
            const res = await request(app)
                .post('/api/timetable/generate')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Academic calendar ID is required');
        });

        it('should return 202 on successful job start', async () => {
            const mockTimetable = { _id: 't1', metadata: { generationTime: 100 }, statistics: {} };
            timetableService.generateTimetable.mockResolvedValue(mockTimetable);
            Timetable.findById.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        populate: jest.fn().mockReturnValue({
                            populate: jest.fn().mockReturnValue({
                                populate: jest.fn().mockResolvedValue(mockTimetable)
                            })
                        })
                    })
                })
            });

            const res = await request(app)
                .post('/api/timetable/generate')
                .send({ academicCalendarId: '6574c8f5e4b0f1a2c3d4e5f6' });

            expect(res.status).toBe(202);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Timetable generation started');
            expect(res.body.jobId).toBeDefined();
        });
    });

    describe('GET /api/timetable', () => {
        it('should return 404 if timetable not found', async () => {
            Timetable.findOne.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        populate: jest.fn().mockReturnValue({
                            populate: jest.fn().mockReturnValue({
                                populate: jest.fn().mockReturnValue({
                                    populate: jest.fn().mockResolvedValue(null)
                                })
                            })
                        })
                    })
                })
            });

            const res = await request(app)
                .get('/api/timetable?academicCalendarId=6574c8f5e4b0f1a2c3d4e5f6');

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Timetable not found');
        });
    });
});
