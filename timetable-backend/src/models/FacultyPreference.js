const mongoose = require('mongoose');

const facultyPreferenceSchema = new mongoose.Schema({
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: [true, 'Faculty is required']
  },
  academicCalendar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicCalendar',
    required: [true, 'Academic calendar is required']
  },
  preferences: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    priority: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    }
  }],
  unavailableDays: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    slots: [Number]
  }],
  preferredDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  }],
  maxHoursPerDay: {
    type: Number,
    default: 6
  },
  remarks: {
    type: String,
    trim: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isSubmitted: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

/* =========================================================
   INDEXES
========================================================= */

// One preference per faculty per academic calendar
facultyPreferenceSchema.index(
  { faculty: 1, academicCalendar: 1 },
  { unique: true }
);

/* =========================================================
   VALIDATIONS
========================================================= */

facultyPreferenceSchema.pre('save', async function (next) {
  try {
    if (!this.preferences || this.preferences.length === 0) {
      return next(new Error('At least one course preference is required'));
    }

    // Allow 5 or 6 preferences (minimum requirement changed)
    if (this.preferences.length < 5 || this.preferences.length > 6) {
      return next(new Error('Please select between 5 and 6 course preferences'));
    }

    // Populate course details to check year
    await this.populate('preferences.course');

    const yearCount = {
      1: 0,
      2: 0,
      3: 0,
      4: 0
    };

    this.preferences.forEach(p => {
      if (!p.course || !p.course.year) {
        throw new Error('Invalid course in preferences');
      }
      if (!yearCount.hasOwnProperty(p.course.year)) {
        throw new Error(`Unsupported course year: ${p.course.year}`);
      }
      yearCount[p.course.year]++;
    });

    // Enforce maxima per year (teachers can select up to these counts)
    if (yearCount[1] > 1) {
      return next(new Error('At most 1 course allowed from 1st year'));
    }
    if (yearCount[2] > 2) {
      return next(new Error('At most 2 courses allowed from 2nd year'));
    }
    if (yearCount[3] > 2) {
      return next(new Error('At most 2 courses allowed from 3rd year'));
    }
    if (yearCount[4] > 1) {
      return next(new Error('At most 1 course allowed from 4th year'));
    }

    // Require exactly one course selected between 1st or 4th year
    if ((yearCount[1] + yearCount[4]) !== 1) {
      return next(new Error('Select exactly one course from either 1st year or 4th year'));
    }

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('FacultyPreference', facultyPreferenceSchema);
