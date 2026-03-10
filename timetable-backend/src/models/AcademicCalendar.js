const mongoose = require('mongoose');

const academicCalendarSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    trim: true
  },
  semester: {
    type: String,
    enum: ['Odd-Semester', 'Even-Semester'],
    required: [true, 'Semester is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function (value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  workingDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }],
  holidays: [{
    date: Date,
    name: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for quick lookup of active academic calendar
academicCalendarSchema.index({ isActive: 1, academicYear: 1 });

module.exports = mongoose.model('AcademicCalendar', academicCalendarSchema);