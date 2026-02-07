// MOCK ALL MODELS USED BY CONTROLLER
jest.mock('../models/AcademicCalendar');
jest.mock('../models/TimeSlot');
jest.mock('../models/Course');
jest.mock('../models/Faculty');
jest.mock('../models/Room');
jest.mock('../models/WorkloadRule');

const adminController = require('../controllers/adminController');
const Course = require('../models/Course');

describe('Admin Controller - Course Tests', () => {

  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  /* ===============================
     5 VALID TESTS
  =============================== */

  test('1. createCourse success', async () => {
    const req = { body: { courseCode: 'CSE101' } };

    Course.create.mockResolvedValue(req.body);

    await adminController.createCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('2. getCourses success', async () => {
    const req = { query: {} };

    Course.find.mockReturnValue({
      populate: () => ({
        sort: () => Promise.resolve([])
      })
    });

    await adminController.getCourses(req, res);

    expect(res.json).toHaveBeenCalled();
  });

  test('3. updateCourse success', async () => {
    const req = { params: { id: '1' }, body: { name: 'Updated' } };

    Course.findByIdAndUpdate.mockResolvedValue({ id: '1' });

    await adminController.updateCourse(req, res);

    expect(res.json).toHaveBeenCalled();
  });

  test('4. deleteCourse success', async () => {
    const req = { params: { id: '1' } };

    Course.findByIdAndDelete.mockResolvedValue({ id: '1' });

    await adminController.deleteCourse(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Course deleted'
    });
  });

  test('5. getCourses with filters', async () => {
    const req = { query: { year: '3' } };

    Course.find.mockReturnValue({
      populate: () => ({
        sort: () => Promise.resolve([])
      })
    });

    await adminController.getCourses(req, res);

    expect(Course.find).toHaveBeenCalled();
  });

  /* ===============================
     5 INVALID TESTS
  =============================== */

  test('6. updateCourse not found', async () => {
    const req = { params: { id: '1' }, body: {} };

    Course.findByIdAndUpdate.mockResolvedValue(null);

    await adminController.updateCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('7. deleteCourse not found', async () => {
    const req = { params: { id: '1' } };

    Course.findByIdAndDelete.mockResolvedValue(null);

    await adminController.deleteCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('8. createCourse DB error', async () => {
    const req = { body: {} };

    Course.create.mockRejectedValue(new Error('DB error'));

    await expect(adminController.createCourse(req, res))
      .rejects.toThrow();
  });

  test('9. getCourses DB error', async () => {
    const req = { query: {} };

    Course.find.mockImplementation(() => {
      throw new Error('DB error');
    });

    await expect(adminController.getCourses(req, res))
      .rejects.toThrow();
  });

  test('10. updateCourse invalid id', async () => {
    const req = { params: { id: null }, body: {} };

    Course.findByIdAndUpdate.mockResolvedValue(null);

    await adminController.updateCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

});
