const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: [true, 'Course code is required'],
      uppercase: true,
      trim: true
    },

    courseName: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true
    },

    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: 1,
      max: 5
    },

    // ⭐ THIS IS THE IMPORTANT PART
    sections: [
      {
        type: String,
        uppercase: true,
        trim: true
      }
    ],

    courseType: {
      type: String,
      enum: ['theory', 'lab', 'tutorial'],
      required: [true, 'Course type is required']
    },

    lectureHours: {
      type: Number,
      default: 0,
      min: 0
    },

    tutorialHours: {
      type: Number,
      default: 0,
      min: 0
    },

    practicalHours: {
      type: Number,
      default: 0,
      min: 0
    },

    weeklyHours: {
      type: Number,
      required: [true, 'Weekly hours is required'],
      min: 1
    },

    department: {
      type: String,
      trim: true
    },

    assignedFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      default: null
    },

    isElective: {
      type: Boolean,
      default: false
    },

    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
      }
    ],

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

/**
 * A course is unique per year
 * CS101 (Year 1) ✅
 * CS101 (Year 2) ❌ unless explicitly allowed
 */
courseSchema.index({ courseCode: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);
