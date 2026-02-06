const AcademicCalendar = require('../models/AcademicCalendar');
const TimeSlot = require('../models/TimeSlot');
const Course = require('../models/Course');
const Faculty = require('../models/Faculty');
const Room = require('../models/Room');
const WorkloadRule = require('../models/WorkloadRule');
const Timetable = require('../models/Timetable');
const FacultyLeave = require('../models/FacultyLeave');

class AdminController {

  /* =========================
     ACADEMIC CALENDAR
  ========================= */
  async createAcademicCalendar(req, res) {
    const calendar = await AcademicCalendar.create(req.body);
    res.status(201).json({ success: true, data: calendar });
  }

  async getAcademicCalendars(req, res) {
    const calendars = await AcademicCalendar.find().sort({ createdAt: -1 });
    res.json({ success: true, data: calendars });
  }

  async updateAcademicCalendar(req, res) {
    const calendar = await AcademicCalendar.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!calendar) {
      return res.status(404).json({ success: false, error: 'Academic calendar not found' });
    }
    res.json({ success: true, data: calendar });
  }

  async deleteAcademicCalendar(req, res) {
    const calendar = await AcademicCalendar.findByIdAndDelete(req.params.id);
    if (!calendar) {
      return res.status(404).json({ success: false, error: 'Academic calendar not found' });
    }
    res.json({ success: true, message: 'Academic calendar deleted' });
  }

  /* =========================
     TIME SLOTS
  ========================= */
  async createTimeSlot(req, res) {
    const slot = await TimeSlot.create(req.body);
    res.status(201).json({ success: true, data: slot });
  }

  async getTimeSlots(req, res) {
    const slots = await TimeSlot.find().sort({ slotNumber: 1 });
    res.json({ success: true, data: slots });
  }

  async updateTimeSlot(req, res) {
    const slot = await TimeSlot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!slot) return res.status(404).json({ success: false, error: 'Time slot not found' });
    res.json({ success: true, data: slot });
  }

  async deleteTimeSlot(req, res) {
    const slot = await TimeSlot.findByIdAndDelete(req.params.id);
    if (!slot) return res.status(404).json({ success: false, error: 'Time slot not found' });
    res.json({ success: true, message: 'Time slot deleted' });
  }

  /* =========================
     COURSES
  ========================= */
  async createCourse(req, res) {
    const course = await Course.create(req.body);
    res.status(201).json({ success: true, data: course });
  }

  async getCourses(req, res) {
    const filter = {};
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.courseType) filter.courseType = req.query.courseType;
    if (req.query.section) filter.sections = req.query.section;

    const courses = await Course.find(filter)
      .populate('assignedFaculty')
      .sort({ year: 1, courseCode: 1 });

    res.json({ success: true, data: courses });
  }

  async updateCourse(req, res) {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
    res.json({ success: true, data: course });
  }

  async deleteCourse(req, res) {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
    res.json({ success: true, message: 'Course deleted' });
  }

  /* =========================
     FACULTY
  ========================= */
  async createFaculty(req, res) {
    const faculty = await Faculty.create(req.body);
    res.status(201).json({ success: true, data: faculty });
  }

  async getFaculty(req, res) {
    const faculty = await Faculty.find().sort({ name: 1 });
    res.json({ success: true, data: faculty });
  }

  async updateFaculty(req, res) {
    const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!faculty) return res.status(404).json({ success: false, error: 'Faculty not found' });
    res.json({ success: true, data: faculty });
  }

  async deleteFaculty(req, res) {
    const faculty = await Faculty.findByIdAndDelete(req.params.id);
    if (!faculty) return res.status(404).json({ success: false, error: 'Faculty not found' });
    res.json({ success: true, message: 'Faculty deleted' });
  }

  /* =========================
     ROOMS
  ========================= */
  async createRoom(req, res) {
    const room = await Room.create(req.body);
    res.status(201).json({ success: true, data: room });
  }

  async getRooms(req, res) {
    const rooms = await Room.find().sort({ roomNumber: 1 });
    res.json({ success: true, data: rooms });
  }

  async updateRoom(req, res) {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    res.json({ success: true, data: room });
  }

  async deleteRoom(req, res) {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    res.json({ success: true, message: 'Room deleted' });
  }

  /* =========================
     WORKLOAD RULES
  ========================= */
  async createWorkloadRule(req, res) {
    const rule = await WorkloadRule.create(req.body);
    res.status(201).json({ success: true, data: rule });
  }

  async getWorkloadRules(req, res) {
    const rules = await WorkloadRule.find().sort({ createdAt: -1 });
    res.json({ success: true, data: rules });
  }

  async updateWorkloadRule(req, res) {
    const rule = await WorkloadRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ success: false, error: 'Workload rule not found' });
    res.json({ success: true, data: rule });
  }

  /* =========================
     LEAVE MANAGEMENT
  ========================= */
  async getPendingLeaves(req, res) {
    const leaves = await FacultyLeave.find({ status: 'pending' })
      .populate('faculty')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: leaves });
  }

  async approveLeave(req, res) {
    const leave = await FacultyLeave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, error: 'Leave not found' });

    leave.status = 'approved';
    await leave.save();

    res.json({ success: true, data: leave });
  }

  async rejectLeave(req, res) {
    const leave = await FacultyLeave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, error: 'Leave not found' });

    leave.status = 'rejected';
    await leave.save();

    res.json({ success: true, data: leave });
  }

  /* =========================
     TIMETABLE LOCK / UNLOCK
  ========================= */
  async lockTimetable(req, res) {
    const timetable = await Timetable.findOne({ status: 'generated' });
    if (!timetable) return res.status(404).json({ success: false, error: 'No timetable found' });

    timetable.status = 'locked';
    await timetable.save();

    res.json({ success: true, data: timetable });
  }

  async unlockTimetable(req, res) {
    const timetable = await Timetable.findOne({ status: 'locked' });
    if (!timetable) return res.status(404).json({ success: false, error: 'No locked timetable' });

    timetable.status = 'generated';
    await timetable.save();

    res.json({ success: true, data: timetable });
  }
}

module.exports = new AdminController();
