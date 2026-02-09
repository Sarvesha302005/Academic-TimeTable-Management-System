const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const { requireRole } = require('../middleware/auth');
const { facultyPreferenceValidation, validateObjectId } = require('../utils/validators');
const { ROLES } = require('../utils/constants');
const { body } = require('express-validator');
const { validate } = require('../utils/validators');

// All routes require faculty role
router.use(requireRole(ROLES.FACULTY));

// Profile routes
router.get('/profile', facultyController.getProfile);
router.put('/profile', facultyController.updateProfile);

// Course preferences routes
router.get('/courses', facultyController.getAvailableCourses);
router.post('/preferences', facultyController.submitPreferences);
router.get('/preferences', facultyController.getPreferences);

// Availability routes
router.put('/availability', facultyController.updateAvailability);

// Leave routes
router.post('/leave', [
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('leaveType').isIn(['casual', 'sick', 'earned', 'maternity', 'paternity', 'other']).withMessage('Invalid leave type'),
  body('reason').notEmpty().withMessage('Reason is required'),
  validate
], facultyController.applyLeave);
router.get('/leave', facultyController.getLeaveHistory);
router.delete('/leave/:id', validateObjectId('id'), facultyController.cancelLeave);


module.exports = router;
