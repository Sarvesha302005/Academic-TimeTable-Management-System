const mongoose = require('mongoose');

const workloadRuleSchema = new mongoose.Schema({
  academicCalendar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicCalendar',
    required: true
  },
  maxHoursPerWeek: {
    type: Number,
    min: 1,
    default: 20
  },
  maxHoursPerDay: {
    type: Number,
    min: 1,
    default: 6
  },
  maxConsecutiveHours: {
    type: Number,
    min: 1,
    default: 3
  },
  minBreakBetweenClasses: {
    type: Number,
    min: 0,
    default: 0
  },
  maxCoursesPerFaculty: {
    type: Number,
    min: 1,
    default: 5
  },
  allowBackToBackLectures: {
    type: Boolean,
    default: true
  },
  minGapAfterLab: {
    type: Number,
    min: 0,
    default: 0
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});


workloadRuleSchema.index(
  { academicCalendar: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true }
  }
);

module.exports = mongoose.model('WorkloadRule', workloadRuleSchema);
