// MOCK ALL MODELS USED BY CONTROLLER
jest.mock('../models/AcademicCalendar');
jest.mock('../models/TimeSlot');
jest.mock('../models/Course');
jest.mock('../models/Faculty');
jest.mock('../models/Room');
jest.mock('../models/WorkloadRule');

const adminController = require('../controllers/adminController');
const WorkloadRule = require('../models/WorkloadRule');

describe('Admin Controller - Workload Rule', () => {

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

  test('1. createWorkloadRule success', async () => {
    const req = { body: { maxHoursPerWeek: 18 } };

    WorkloadRule.create.mockResolvedValue(req.body);

    await adminController.createWorkloadRule(req, res);

    expect(WorkloadRule.create).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: req.body
    });
  });

  test('2. getWorkloadRules success', async () => {
    const req = {};

    WorkloadRule.find.mockReturnValue({
      sort: () => Promise.resolve([])
    });

    await adminController.getWorkloadRules(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: []
    });
  });

  test('3. updateWorkloadRule success', async () => {
    const req = { params: { id: '1' }, body: { maxHoursPerWeek: 20 } };

    WorkloadRule.findByIdAndUpdate.mockResolvedValue({ id: '1' });

    await adminController.updateWorkloadRule(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: '1' }
    });
  });

  test('4. getWorkloadRules sorted', async () => {
    const req = {};

    WorkloadRule.find.mockReturnValue({
      sort: () => Promise.resolve([{ maxHoursPerWeek: 18 }])
    });

    await adminController.getWorkloadRules(req, res);

    expect(WorkloadRule.find).toHaveBeenCalled();
  });

  test('5. createWorkloadRule multiple fields', async () => {
    const req = { body: { maxHoursPerWeek: 18, minHoursPerWeek: 6 } };

    WorkloadRule.create.mockResolvedValue(req.body);

    await adminController.createWorkloadRule(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  /* ===============================
     5 INVALID TESTS
  =============================== */

  test('6. updateWorkloadRule not found', async () => {
    const req = { params: { id: '1' }, body: {} };

    WorkloadRule.findByIdAndUpdate.mockResolvedValue(null);

    await adminController.updateWorkloadRule(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('7. updateWorkloadRule invalid id', async () => {
    const req = { params: { id: null }, body: {} };

    WorkloadRule.findByIdAndUpdate.mockResolvedValue(null);

    await adminController.updateWorkloadRule(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('8. createWorkloadRule empty body', async () => {
    const req = { body: {} };

    WorkloadRule.create.mockResolvedValue(req.body);

    await adminController.createWorkloadRule(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('9. getWorkloadRules empty result', async () => {
    const req = {};

    WorkloadRule.find.mockReturnValue({
      sort: () => Promise.resolve([])
    });

    await adminController.getWorkloadRules(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: []
    });
  });

  test('10. updateWorkloadRule null response', async () => {
    const req = { params: { id: '999' }, body: { maxHoursPerWeek: 10 } };

    WorkloadRule.findByIdAndUpdate.mockResolvedValue(null);

    await adminController.updateWorkloadRule(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

});
