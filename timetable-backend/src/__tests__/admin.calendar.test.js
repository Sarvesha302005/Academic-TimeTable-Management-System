// MOCK ALL MODELS USED BY CONTROLLER
jest.mock('../models/AcademicCalendar');
jest.mock('../models/TimeSlot');
jest.mock('../models/Course');
jest.mock('../models/Faculty');
jest.mock('../models/Room');
jest.mock('../models/WorkloadRule');

const adminController = require('../controllers/adminController');
const AcademicCalendar = require('../models/AcademicCalendar');

describe('Admin Controller - Academic Calendar', () => {

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

  test('1. createAcademicCalendar success', async () => {
    const req = { body: { year: 2025, semester: 'Odd' } };

    AcademicCalendar.create.mockResolvedValue(req.body);

    await adminController.createAcademicCalendar(req, res);

    expect(AcademicCalendar.create).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: req.body
    });
  });

  test('2. getAcademicCalendars success', async () => {
    const req = {};

    AcademicCalendar.find.mockReturnValue({
      sort: () => Promise.resolve([])
    });

    await adminController.getAcademicCalendars(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: []
    });
  });

  test('3. updateAcademicCalendar success', async () => {
    const req = {
      params: { id: '1' },
      body: { semester: 'Even' }
    };

    AcademicCalendar.findByIdAndUpdate.mockResolvedValue({ id: '1' });

    await adminController.updateAcademicCalendar(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: '1' }
    });
  });

  test('4. deleteAcademicCalendar success', async () => {
    const req = { params: { id: '1' } };

    AcademicCalendar.findByIdAndDelete.mockResolvedValue({ id: '1' });

    await adminController.deleteAcademicCalendar(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Academic calendar deleted'
    });
  });

  test('5. getAcademicCalendars sorted', async () => {
    const req = {};

    AcademicCalendar.find.mockReturnValue({
      sort: () => Promise.resolve([{ year: 2025 }])
    });

    await adminController.getAcademicCalendars(req, res);

    expect(AcademicCalendar.find).toHaveBeenCalled();
  });

  /* ===============================
     5 INVALID TESTS
  =============================== */

  test('6. updateAcademicCalendar not found', async () => {
    const req = { params: { id: '1' }, body: {} };

    AcademicCalendar.findByIdAndUpdate.mockResolvedValue(null);

    await adminController.updateAcademicCalendar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('7. deleteAcademicCalendar not found', async () => {
    const req = { params: { id: '1' } };

    AcademicCalendar.findByIdAndDelete.mockResolvedValue(null);

    await adminController.deleteAcademicCalendar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('8. createAcademicCalendar empty body', async () => {
    const req = { body: {} };

    AcademicCalendar.create.mockResolvedValue(req.body);

    await adminController.createAcademicCalendar(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('9. getAcademicCalendars empty list', async () => {
    const req = {};

    AcademicCalendar.find.mockReturnValue({
      sort: () => Promise.resolve([])
    });

    await adminController.getAcademicCalendars(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: []
    });
  });

  test('10. updateAcademicCalendar invalid id', async () => {
    const req = { params: { id: null }, body: {} };

    AcademicCalendar.findByIdAndUpdate.mockResolvedValue(null);

    await adminController.updateAcademicCalendar(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

});
