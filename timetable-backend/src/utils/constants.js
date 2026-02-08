const ROLES = {
  ADMIN: 'admin',
  FACULTY: 'faculty',
  STUDENT: 'student'
};

const COURSE_TYPES = {
  THEORY: 'theory',
  LAB: 'lab',
  TUTORIAL: 'tutorial'
};

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const TIMETABLE_STATUS = {
  DRAFT: 'draft',
  GENERATED: 'generated',
  LOCKED: 'locked'
};

const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

const ROOM_TYPES = {
  CLASSROOM: 'classroom',
  LAB: 'lab',
  SEMINAR_HALL: 'seminar_hall',
  AUDITORIUM: 'auditorium'
};

module.exports = {
  ROLES,
  COURSE_TYPES,
  DAYS_OF_WEEK,
  TIMETABLE_STATUS,
  LEAVE_STATUS,
  ROOM_TYPES
};