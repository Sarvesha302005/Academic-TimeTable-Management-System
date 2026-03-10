// MOCK ALL MODELS USED BY CONTROLLER
jest.mock('../models/AcademicCalendar');
jest.mock('../models/TimeSlot');
jest.mock('../models/Course');
jest.mock('../models/Faculty');
jest.mock('../models/Room');
jest.mock('../models/WorkloadRule');

const adminController = require('../controllers/adminController');
const TimeSlot = require('../models/TimeSlot');

describe('Admin Controller - Time Slot', () => {

  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  /* ===============================
     5 VALID TESTS
  =============================== */

  test('1. createTimeSlot success', async () => {
    const req = { body: { slotNumber: 1 } };

    TimeSlot.create.mockResolvedValue(req.body);

    await adminController.createTimeSlot(req, res);

    expect(TimeSlot.create).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('2. getTimeSlots success', async () => {
    const req = {};

    TimeSlot.find.mockReturnValue({
      sort: () => Promise.resolve([])
    });

    await adminController.getTimeSlots(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: []
    });
  });

  test('3. updateTimeSlot success', async () => {
    const req = { params: { id: '1' }, body: { startTime: '10:00' } };

    TimeSlot.findByIdAndUpdate.mockResolvedValue({ id: '1' });

    await adminController.updateTimeSlot(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: '1' }
    });
  });

  test('4. deleteTimeSlot success', async () => {
    const req = { params: { id: '1' } };

    TimeSlot.findByIdAndDelete.mockResolvedValue({ id: '1' });

    await adminController.deleteTimeSlot(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Time slot deleted'
    });
  });

  test('5. getTimeSlots sorted', async () => {
    const req = {};

    TimeSlot.find.mockReturnValue({
      sort: () => Promise.resolve([{ slotNumber: 1 }])
    });

    await adminController.getTimeSlots(req, res);

    expect(TimeSlot.find).toHaveBeenCalled();
  });

  /* ===============================
     5 INVALID TESTS
  =============================== */

  test('6. updateTimeSlot not found', async () => {
    const req = { params: { id: '1' }, body: {} };

    TimeSlot.findByIdAndUpdate.mockResolvedValue(null);

    await adminController.updateTimeSlot(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('7. deleteTimeSlot not found', async () => {
    const req = { params: { id: '1' } };

    TimeSlot.findByIdAndDelete.mockResolvedValue(null);

    await adminController.deleteTimeSlot(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('8. createTimeSlot empty body', async () => {
    const req = { body: {} };

    TimeSlot.create.mockResolvedValue(req.body);

    await adminController.createTimeSlot(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('9. getTimeSlots empty result', async () => {
    const req = {};

    TimeSlot.find.mockReturnValue({
      sort: () => Promise.resolve([])
    });

    await adminController.getTimeSlots(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: []
    });
  });

  test('10. updateTimeSlot invalid id', async () => {
    const req = { params: { id: null }, body: {} };

    TimeSlot.findByIdAndUpdate.mockResolvedValue(null);

    await adminController.updateTimeSlot(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

});
