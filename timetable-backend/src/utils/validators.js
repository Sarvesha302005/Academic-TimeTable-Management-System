const { body, param, validationResult } = require('express-validator');

/* ======================================================
   COMMON VALIDATOR HANDLER
====================================================== */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array()
    });
  }
  next();
};

const validateObjectId = (fieldName) =>
  param(fieldName).isMongoId().withMessage(`${fieldName} must be a valid ID`);

/* ======================================================
   ACADEMIC CALENDAR
====================================================== */
const academicCalendarValidation = [
  body('academicYear').notEmpty().withMessage('Academic year is required'),
  body('semester').isIn(['Odd-Semester', 'Even-Semester']).withMessage('Invalid semester'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('workingDays').isArray({ min: 1 }).withMessage('Working days must be an array'),
  body('holidays').optional().isArray(),
  validate
];

/* ======================================================
   TIME SLOT
====================================================== */
const timeSlotValidation = [
  body('slotNumber').isInt({ min: 1 }).withMessage('Slot number must be positive'),
  body('startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid start time (HH:MM)'),
  body('endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid end time (HH:MM)'),
  body('duration').isInt({ min: 15 }).withMessage('Duration must be ≥ 15 mins'),
  validate
];

/* ======================================================
   ✅ COURSE (MULTI-SECTION – FIXED)
====================================================== */
const courseValidation = [
  body('courseCode').notEmpty().withMessage('Course code is required'),
  body('courseName').notEmpty().withMessage('Course name is required'),

  body('year')
    .isInt({ min: 1, max: 5 })
    .withMessage('Year must be between 1 and 5'),

  // 🔥 THIS IS THE KEY FIX
  body('sections')
    .isArray({ min: 1 })
    .withMessage('At least one section is required'),

  body('sections.*')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Invalid section value'),

  body('courseType')
    .isIn(['theory', 'lab', 'tutorial'])
    .withMessage('Invalid course type'),

  body('lectureHours').isInt({ min: 0 }),
  body('tutorialHours').isInt({ min: 0 }),
  body('practicalHours').isInt({ min: 0 }),

  body('weeklyHours')
    .isInt({ min: 1 })
    .withMessage('Weekly hours must be at least 1'),

  validate
];

/* ======================================================
   ROOM
====================================================== */
const roomValidation = [
  body('roomNumber').notEmpty().withMessage('Room number is required'),
  body('roomType')
    .isIn(['classroom', 'lab', 'seminar_hall', 'auditorium'])
    .withMessage('Invalid room type'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('building').optional().notEmpty(),
  validate
];

/* ======================================================
   WORKLOAD RULE
====================================================== */
const workloadRuleValidation = [
  body('maxHoursPerWeek').isInt({ min: 1 }),
  body('maxHoursPerDay').isInt({ min: 1 }),
  body('maxConsecutiveHours').isInt({ min: 1 }),
  body('minBreakBetweenClasses').isInt({ min: 0 }),
  validate
];

module.exports = {
  validate,
  validateObjectId,
  academicCalendarValidation,
  timeSlotValidation,
  courseValidation,
  roomValidation,
  workloadRuleValidation
};
