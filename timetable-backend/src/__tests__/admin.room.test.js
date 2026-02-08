jest.mock('../models/AcademicCalendar');
jest.mock('../models/TimeSlot');
jest.mock('../models/Course');
jest.mock('../models/Faculty');
jest.mock('../models/Room');
jest.mock('../models/WorkloadRule');

const adminController = require('../controllers/adminController');
const Room = require('../models/Room');

describe('Room - Unit Tests', () => {

  test('should create room', async () => {
    const req = { body: { roomNumber: 'A101', capacity: 60 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    Room.create.mockResolvedValue(req.body);

    await adminController.createRoom(req, res);

    expect(Room.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

});
