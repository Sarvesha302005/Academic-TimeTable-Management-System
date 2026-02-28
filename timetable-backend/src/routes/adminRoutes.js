const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireRole } = require('../middleware/auth');
const {
  academicCalendarValidation,
  timeSlotValidation,
  courseValidation,
  roomValidation,
  workloadRuleValidation,
  validateObjectId
} = require('../utils/validators');
const { ROLES } = require('../utils/constants');

// All routes require admin role
router.use(requireRole(ROLES.ADMIN));

// Academic Calendar routes
router.post('/academic-calendar', academicCalendarValidation, adminController.createAcademicCalendar);
router.get('/academic-calendar', adminController.getAcademicCalendars);
router.put('/academic-calendar/:id', validateObjectId('id'), academicCalendarValidation, adminController.updateAcademicCalendar);
router.delete('/academic-calendar/:id', validateObjectId('id'), adminController.deleteAcademicCalendar);

// Time Slot routes
router.post('/time-slot', timeSlotValidation, adminController.createTimeSlot);
router.get('/time-slot', adminController.getTimeSlots);
router.put('/time-slot/:id', validateObjectId('id'), timeSlotValidation, adminController.updateTimeSlot);
router.delete('/time-slot/:id', validateObjectId('id'), adminController.deleteTimeSlot);

// Course routes
router.post('/course', courseValidation, adminController.createCourse);
router.get('/course', adminController.getCourses);
router.put('/course/:id', validateObjectId('id'), courseValidation, adminController.updateCourse);
router.delete('/course/:id', validateObjectId('id'), adminController.deleteCourse);

// Faculty routes
router.post('/faculty', adminController.createFaculty);
router.get('/faculty', adminController.getFaculty);
router.put('/faculty/:id', validateObjectId('id'), adminController.updateFaculty);
router.delete('/faculty/:id', validateObjectId('id'), adminController.deleteFaculty);

// Room routes
router.post('/room', roomValidation, adminController.createRoom);
router.get('/room', adminController.getRooms);
router.put('/room/:id', validateObjectId('id'), roomValidation, adminController.updateRoom);
router.delete('/room/:id', validateObjectId('id'), adminController.deleteRoom);

// Workload Rules routes
router.post('/workload-rule', workloadRuleValidation, adminController.createWorkloadRule);
router.get('/workload-rule', adminController.getWorkloadRules);
router.put('/workload-rule/:id', validateObjectId('id'), workloadRuleValidation, adminController.updateWorkloadRule);

// Leave Management routes
router.get('/leave/pending', adminController.getPendingLeaves);
router.put('/leave/:id/approve', validateObjectId('id'), adminController.approveLeave);
router.put('/leave/:id/reject', validateObjectId('id'), adminController.rejectLeave);

// Timetable Lock/Unlock routes
router.post('/timetable/lock', adminController.lockTimetable);
router.post('/timetable/unlock', adminController.unlockTimetable);

// Workload Optimization routes
router.get('/workload-report', adminController.getWorkloadReport);

module.exports = router;