const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { requireRole } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const { body } = require('express-validator');
const { validate } = require('../utils/validators');

// Get active academic calendar - Authenticated users
router.get('/active-calendar', timetableController.getActiveCalendar);

// Generate timetable - Admin only
router.post('/generate',
  requireRole(ROLES.ADMIN),
  [
    body('academicCalendarId').isMongoId().withMessage('Valid academic calendar ID is required'),
    validate
  ],
  timetableController.generateTimetable
);

// Get timetable - Admin only
router.get('/',
  requireRole(ROLES.ADMIN),
  timetableController.getTimetable
);

// Get timetable statistics - Admin only
router.get('/statistics',
  requireRole(ROLES.ADMIN),
  timetableController.getTimetableStatistics
);

// Get conflicts - Admin only
router.get('/conflicts',
  requireRole(ROLES.ADMIN),
  timetableController.getConflicts
);

// Get faculty timetable - Faculty only
router.get('/faculty',
  requireRole(ROLES.FACULTY),
  timetableController.getFacultyTimetable
);

module.exports = router;