const mongoose = require('mongoose');

const timetableEntrySchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  slot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeSlot',
    required: true
  },
  slotNumber: {
    type: Number,
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  type: {
    type: String, // 'L', 'T', 'P'
    required: false
  },
  isCompensation: {
    type: Boolean,
    default: false
  },
  date: {
    type: Date // Specific date for this entry (e.g., compensation date)
  },
  originalDate: {
    type: Date // The original date that was missed due to leave
  }
});

const timetableSchema = new mongoose.Schema({
  academicCalendar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicCalendar',
    required: [true, 'Academic calendar is required']
  },
  version: {
    type: Number,
    default: 1
  },
  entries: [timetableEntrySchema],
  status: {
    type: String,
    enum: ['draft', 'generated', 'locked'],
    default: 'draft'
  },
  generatedAt: {
    type: Date
  },
  lockedAt: {
    type: Date
  },
  lockedBy: {
    type: String
  },
  conflicts: [{
    type: {
      type: String,
      enum: ['faculty_conflict', 'room_conflict', 'student_conflict', 'faculty_assignment_conflict']
    },
    description: String,
    entries: [mongoose.Schema.Types.Mixed]
  }],
  statistics: {
    totalClasses: Number,
    facultyUtilization: Number,
    roomUtilization: Number,
    averageClassesPerDay: Number,
    facultyDistribution: mongoose.Schema.Types.Mixed,
    roomDistribution: mongoose.Schema.Types.Mixed
  },
  metadata: {
    generationTime: Number,
    solverStatus: String,
    constraintsSatisfied: Boolean
  }
}, {
  timestamps: true
});

// Index for quick lookups
timetableSchema.index({ academicCalendar: 1, status: 1 });
timetableSchema.index({ 'entries.faculty': 1 });
timetableSchema.index({ 'entries.year': 1, 'entries.section': 1 });

module.exports = mongoose.model('Timetable', timetableSchema);