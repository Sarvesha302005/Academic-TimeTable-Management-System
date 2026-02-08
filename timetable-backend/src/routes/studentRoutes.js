const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { requireRole } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

// All routes require student role
router.use(requireRole(ROLES.STUDENT));

// Timetable viewing routes
router.get('/timetable', studentController.viewTimetable);
router.get('/timetable/formatted', studentController.getFormattedTimetable);

module.exports = router;